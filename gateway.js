var request = require("request");
var fs = require("fs");
var rl = require("readline-sync");
var CREDENTIALS_FILENAME = '.credentials.txt';  // this optional file contains your saved base64 string
/* Choose the proper HTTP or HTTPS, SAP Cloud Platformrequires HTTPS */
var http = require('https');
var SensorTag = require('sensortag');

// SAP Cloud Platform connection details
// IoT Service
var portIoT = 443;
var pathIoT = '/com.sap.iotservices.mms/v1/api/http/data/';
var hostIoT = 'iotmmsp2000319942trial.hanatrial.ondemand.com';
var authStrIoT = 'Bearer 26535de8eec3eb7c8d7cb0a8fb7335a1';
var authStrIncidentLog = 'Bearer 7153e5144e72f4949ccf777a387c35';
var iotDeviceId = '31d504ff-3ef9-4a7b-a3fe-c98297deb3cb';
var incidentLogDeviceId = '80c04384-651e-4420-9ed4-a56f52d0c805';
var iotDataMessageTypeID = '5272a0aa64cec578f2f9';
var incidentLogMessageTypeID = '35970b0909ffb71c3f4f';

var incidentLogUrl = 'https://' + hostIoT + pathIoT + incidentLogMessageTypeID;

// BPMS
var bpmsUrl = 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1';
var bpmsXSRFTokenUrl = bpmsUrl + '/rules/xsrf-token';
var bpmsInvokeRuleUrl = bpmsUrl + '/rules/invoke';
var ruleServiceName = 'IoTManager::IoTRuleService';

// Notification Service
var notificationServiceUrl = 'https://hcpms-p2000319942trial.hanatrial.ondemand.com/restnotification/application/com.sap.iot.manager/';

// SENSOR DATA BEGIN
var sensor_data = {
    timestamp: "{{$timestamp}}",
    sensorAccX: 0.0,
    sensorAccY: 0.0,
    sensorAccZ: 0.0,
    sensorBarometric: 0.0,
    sensorGyroX: -1.0,
    sensorGyroY: -1.0,
    sensorGyroZ: -1.0,
    sensorHumidity: 0.0,
    sensorMagX: 0.0,
    sensorMagY: 0.0,
    sensorMagZ: 0.,
    sensorObjectTemp: 0.0,
    sensorOptical: 0.0,
    sensorTemp: 0.0
}
var numberOfSensorsEnabled = 0; // basically we're going to count the number of sensors enabled, and start the whole loop when it reaches 7
var numberOfSensorsToEnable = 7;
// END SENSOR DATA

var DEBUG_VALUE = true; // print verbose debug statements
var SHOULD_SEND_TO_SAP = true; // set this to false if you do not want to communicate with cloud platform

function getCredentials(credentials_filename) {
    /**
     * @return the Basic authentication string in Base64
     */
    var credential;
    try {
        credential = fs.readFileSync(credentials_filename);
    } catch (e) {
        console.log("Cannot find credentials file.");
    }
    if (credential) {
        return credential;
    } else {
        var SAP_CLOUD_USERNAME = rl.questionEMail('SAP CP Username (email): ');
        var SAP_CLOUD_PASSWORD = rl.question('SAP CP Password: ', {
            'hideEchoBack': true
        });
        var base64_auth = Buffer.from(SAP_CLOUD_USERNAME + ':' + SAP_CLOUD_PASSWORD).toString('base64');
        if (rl.keyInYNStrict('Would you like to save your credentials (NOT SECURE - SAVED ON DISK)?')) {
            fs.writeFileSync(credentials_filename, base64_auth);
        }
        return base64_auth;
    }
}

function getCurrentTimeAsString() {
    /**
     * @returns {String} the current time in Epoch time
     */
    date = new Date();
    return String(Math.floor(date.getTime() / 1000));
}

var basicAuthString = getCredentials(CREDENTIALS_FILENAME);


var writeLogToDatabase = function (description, code) {
    /**
     * @param {string} description description of the incident
     * @param {string} code incident code (i.e. "HEAT" or "MOVEMENT")
     */
    var body = {
        mode: "sync",
        messageType: incidentLogMessageTypeID,
        messages: [
            {
                timestamp: getCurrentTimeAsString(),
                description: description,
                incident_code: code
            }
        ]
    };
    var logWriteOptions = {
        method: 'POST',
        url: incidentLogUrl,
        headers:
        {
            Authorization: authStrIncidentLog
        },
        body: body,
        json: true
    };

    request(logWriteOptions, function (error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode < 200 || response.statusCode > 299) {
            throw new Error("HTTP" + response.statusCode + " - Non-200 status code returned while writing incident.");
        }
        console.log("Successfully submitted incident log.");
    });
}

var sendNotification = function (alert, data) {
    var notificationOptions = {
        method: 'POST',
        url: notificationServiceUrl,
        headers:
        {
            'Cache-Control': 'no-cache',
            Authorization: 'Basic ' + basicAuthString,
            'Content-Type': 'application/json'
        },
        body:
        {
            alert: alert,
            data: data,
            sound: 'default'
        },
        json: true
    };

    request(notificationOptions, function (error, response, body) {
        if (error) throw new Error(error);

        if (response.statusCode < 200 || response.statusCode > 299) {
            throw new Error("HTTP" + response.statusCode + " - Non-200 status code returned while sending notification.");
        }
        console.log("Notification Successfully Sent!");
    });
}

var checkData = function (temperature, gyrox, gyroy, gyroz, XSRF, cookie) {
    var options = {
        method: 'POST',
        url: bpmsInvokeRuleUrl,
        qs: { rule_service_name: ruleServiceName },
        headers:
        {
            'Cache-Control': 'no-cache',
            Authorization: 'Basic ' + basicAuthString,
            'Content-Type': 'application/json',
            'X-CSRF-Token': XSRF,
            'Cookie': cookie
        },
        body:
            [{
                __type__: 'IoTManagerDataObjects',
                Temperature: temperature,
                GyroX: gyrox,
                GyroY: gyroy,
                GyroZ: gyroz
            }],
        json: true
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode < 200 || response.statusCode > 299) {
            throw new Error("HTTP" + response.statusCode + " - Non-200 status code returned while calling business rules.");
        }
        console.log("#################################################################");
        var data = JSON.stringify(body);
        console.log("Response From Business Rules API" + JSON.stringify(body));
        console.log("body is" + body);
        console.log("body is" + body[0].MovementDetected);
        console.log("#################################################################");
        if (body[0].MovementDetected) {
            console.log("Movement Warning! Sending Notification...");
            sendNotification("Movement Warning Triggered!", "MOVEMENT");
            writeLogToDatabase("Movement Detected", "MOVEMENT");
        }
        if (body[0].TemperatureExceeded) {
            console.log("Temperature Warning! Sending Notification...");
            sendNotification("Temperature Warning Triggered!", "HEAT");
            writeLogToDatabase("Temperature Exceeded", "HEAT");
        }
    });

}

/***************************************************************/
/* Coding to access TI SensorTag and values of various sensors */
/***************************************************************/

console.log("If not yet activated, then press the power button.");

// get XSRF token from Business Rules
var XSRFOptions = {
    method: 'GET',
    url: bpmsXSRFTokenUrl,
    headers:
    {
        'cache-control': 'no-cache',
        'x-csrf-token': 'Fetch',
        authorization: 'Basic ' + basicAuthString
    }
};
request(XSRFOptions, function (error, response, body) {
    if (error) throw new Error(error);

    var app_XSRF = response.headers['x-csrf-token'];
    var app_cookie = response.headers['set-cookie'];
    console.log("Achieved XSRF token from SAP = " + app_XSRF);
    SensorTag.discover(function (tag) {
        tag.on('disconnect', function () {
            console.log('disconnected!');
            process.exit(0);
        });

        function start() {
            console.log('Connect Device and Execute Sensors');
            tag.connectAndSetUp(enableSensors); // enableSensors()
        }

        function enableSensors() {
            /* Read device specifics */
            tag.readDeviceName(function (error, deviceName) {
                console.log('Device Name = ' + deviceName);
            });
            tag.readSystemId(function (error, systemId) {
                console.log('System ID = ' + systemId);
                lv_deviceid = systemId;
            });
            tag.readSerialNumber(function (error, serialNumber) {
                console.log('Serial Number = ' + serialNumber);
            });
            tag.readFirmwareRevision(function (error, firmwareRevision) {
                console.log('Firmware Rev = ' + firmwareRevision);
            });
            tag.readHardwareRevision(function (error, hardwareRevision) {
                console.log('Hardware Rev = ' + hardwareRevision);
            });
            tag.readHardwareRevision(function (error, softwareRevision) {
                console.log('Software Revision = ' + softwareRevision);
            });
            tag.readManufacturerName(function (error, manufacturerName) {
                console.log('Manufacturer = ' + manufacturerName);
            });
            /* Enable Sensors */
            console.log("Enabling sensors");
            tag.enableIrTemperature(onSensorEnabled);
            tag.enableHumidity(onSensorEnabled);
            tag.enableMagnetometer(onSensorEnabled);
            tag.enableBarometricPressure(onSensorEnabled);
            tag.enableAccelerometer(onSensorEnabled);
            tag.enableGyroscope(onSensorEnabled);
            tag.enableLuxometer(onSensorEnabled);


            console.log("*********************************************");
            console.log(" To stop press both buttons on the SensorTag ");
            console.log("*********************************************");
            tag.notifySimpleKey(onBothKeysPressed); // if you press both keys, the program exits
        }

        function onSensorEnabled() {
            /* basically callback function for when the sensors are enabled; checks that all sensors are enabled before retrieving data */
            numberOfSensorsEnabled += 1;
            if (numberOfSensorsEnabled == numberOfSensorsToEnable) {
                console.log("All sensors enabled! Retrieving data...");
                initialiseDataRetrievalLoop();
            } else if (numberOfSensorsEnabled > numberOfSensorsToEnable) {
                console.error("Number of sensors enabled exceeded limit! Please set the correct limit. Exiting.");
                tag.disconnect();
            }
        }

        function onBothKeysPressed() {
            tag.on('simpleKeyChange', function (left, right) {
                if (left && right) {
                    tag.disconnect();
                }
            });
        }

        function initialiseDataRetrievalLoop() {
            /**
             * main loop to retrieve data from the tags and push data to cloud platform
             */
            setImmediate(function loop() { // schedule this function
                tag.readIrTemperature(function (error, objectTemperature, ambientTemperature) {
                    sensor_data.sensorObjectTemp = objectTemperature;
                    sensor_data.sensorTemp = ambientTemperature;
                });
                tag.readHumidity(function (error, temperature, humidity) {
                    // lv_temp = temperature.toFixed(1);
                    sensor_data.sensorHumidity = humidity.toFixed(1);
                });
                tag.readAccelerometer(function (error, x, y, z) {
                    sensor_data.sensorAccX = x;
                    sensor_data.sensorAccY = y;
                    sensor_data.sensorAccZ = z;
                });
                tag.readMagnetometer(function (error, x, y, z) {
                    sensor_data.sensorMagX = x;
                    sensor_data.sensorMagY = y;
                    sensor_data.sensorMagZ = z;
                });
                tag.readGyroscope(function (error, x, y, z) {
                    sensor_data.sensorGyroX = x;
                    sensor_data.sensorGyroY = y;
                    sensor_data.sensorGyroZ = z;
                });
                tag.readLuxometer(function (error, lux) {
                    sensor_data.sensorOptical = lux;
                });
                sensor_data.timestamp = getCurrentTimeAsString();
                // call business rules API to check for violations
                checkData(sensor_data.sensorObjectTemp, sensor_data.sensorGyroX, sensor_data.sensorGyroY, sensor_data.sensorGyroZ, app_XSRF, app_cookie);
                sendSensorData(sensor_data); // send the sensor data
                setTimeout(loop, 5000); // schedule it again
            });
        }

        start();
    });
});


/******************************************************************/
/* function to push sensor data to SAP Cloud Platform */
/******************************************************************/
function sendSensorData(sensor_data_payload) {
    /**
     * @param sensor_data_payload the payload as defined by sensor_data
     */
    date = new Date();
    time = date.getTime();
    var data = { // initialise sensor data payload
        "mode": "sync",
        "messageType": iotDataMessageTypeID,
        "messages": [
            sensor_data_payload
        ]
    }
    var strData = JSON.stringify(data);
    if (DEBUG_VALUE)
        console.log("Data: " + strData);
    if (SHOULD_SEND_TO_SAP) {
        if (strData.length > 46) {
            var options = {
                host: hostIoT,
                port: portIoT,
                path: pathIoT + iotDeviceId,
                agent: false,
                headers: {
                    'Authorization': authStrIoT,
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': '*/*'
                },
                method: 'POST',
            };
            if (DEBUG_VALUE)
                console.log("Sending Data to server");
            /* Process HTTP or HTTPS request */
            options.agent = new http.Agent(options);
            var request_callback = function (response) {
                var body = '';
                response.on('data', function (data) {
                    body += data;
                });
                response.on('end', function () {
                    if (DEBUG_VALUE) {
                        console.log("REQUEST END:", response.statusCode);
                        console.log("RESPONSE BODY:\n", body);
                    }
                });
                response.on('error', function (e) {
                    console.error(e);
                });
            }
            var request = http.request(options, request_callback);
            request.on('error', function (e) {
                console.error(e);
            });
            request.write(strData);
            request.end();
        } else {
            if (DEBUG_VALUE)
                console.log("Incomplete Data");
        }
    } else {
        console.log("Skipping sending data to Cloud Platform.")
    }

}  
