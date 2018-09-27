var request = require("request");
var fs = require("fs");

//#########REPLACE WITH YOUR SAP CREDENTIALS#########################
SAP_CLOUD_USERNAME = 'fit4002.intelligence@gmail.com';
SAP_CLOUD_PASSWORD = '2018FIT4002?';
var auth_string = Buffer.from(SAP_CLOUD_USERNAME + ':' + SAP_CLOUD_PASSWORD).toString('base64');
//#################################################################

var XSRFOptions = { method: 'GET',
  url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/xsrf-token',
  headers:
   { 'cache-control': 'no-cache',
     'x-csrf-token': 'Fetch',
     authorization: 'Basic ' + auth_string } };

var sendNotification = function(alert, data) {
  var notificationOptions = { method: 'POST',
    url: 'https://hcpms-p2000319942trial.hanatrial.ondemand.com/restnotification/application/com.sap.iot.manager/',
    headers:
     { 'Cache-Control': 'no-cache',
       Authorization: 'Basic ' + auth_string,
       'Content-Type': 'application/json' },
    body:
     { alert: alert,
       data: data,
       sound: 'default' },
    json: true };
    
  request(notificationOptions, function (error, response, body) {
    if (error) throw new Error(error);

    console.log("Notification Successfully Sent!");
  });
}
var checkData = function(temperature, gyrox, gyroy, gyroz, XSRF, cookie) {
    var options = { method: 'POST',
        url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/invoke',
        qs: { rule_service_name: 'IoTManager::IoTRuleService' },
        headers:
        {'Cache-Control': 'no-cache',
         Authorization: 'Basic ' + auth_string,
         'Content-Type': 'application/json',
         'X-CSRF-Token': XSRF,
          'Cookie': cookie},
        body:
        [ { __type__: 'IoTManagerDataObjects',
           Temperature: temperature,
           GyroX: gyrox,
           GyroY: gyroy,
           GyroZ: gyroz } ],
        json: true 
    };
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      console.log("#################################################################");
      var data = JSON.stringify(body);
      console.log("Response From Business Rules API" + JSON.stringify(body));
      console.log("body is" + body);
      console.log("body is" + body[0].MovementDetected);
      console.log("#################################################################");
      if (body[0].MovementDetected) {
        console.log("Movement Warning! Sending Notification...");
        sendNotification("Movement Warning Triggered!", "fuck");
      }
      if (body[0].TemperatureExceeded) {
        console.log("Temperature Warning! Sending Notification...");
        sendNotification("Temperature Warning Triggered!", "fuck");
      }
    });
    
}

/* Choose the proper HTTP or HTTPS, SAP Cloud Platformrequires HTTPS */
var http = require('https');

var SensorTag = require('sensortag');

// SAP Cloud Platform connection details
var portIoT = 443;
var pathIoT = '/com.sap.iotservices.mms/v1/api/http/data/';
var hostIoT = 'iotmmsp2000319942trial.hanatrial.ondemand.com';
var authStrIoT = 'Bearer 26535de8eec3eb7c8d7cb0a8fb7335a1';
var deviceId = '31d504ff-3ef9-4a7b-a3fe-c98297deb3cb';
var messageTypeID = '5272a0aa64cec578f2f9';

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
var number_of_sensors_enabled = 0;
var number_of_sensors_to_enable = 7;
// END SENSOR DATA
var DEBUG_VALUE = true;
var xtimestamp;
var date = new Date();
var time = date.getTime();
var SHOULD_SEND_TO_SAP = true;

var options = {
    host: hostIoT,
    port: portIoT,
    path: pathIoT + deviceId,
    agent: false,
    headers: {
        'Authorization': authStrIoT,
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': '*/*'
    },
    method: 'POST',
};

/***************************************************************/
/* Coding to access TI SensorTag and values of various sensors */
/***************************************************************/

console.log("If not yet activated, then press the power button.");

request(XSRFOptions, function (error, response, body) {
  if (error) throw new Error(error);

  var app_XSRF = response.headers['x-csrf-token'];
  var app_cookie = response.headers['set-cookie'];
  console.log("Achieved XSRF token from SAP = " + app_XSRF);
  //##################################################################
    SensorTag.discover(function (tag) {
        tag.on('disconnect', function () {
            console.log('disconnected!');
            process.exit(0);
        });

        function connectExecute() {
            console.log('Connect Device and Execute Sensors');
            tag.connectAndSetUp(enableSensors);
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
            tag.notifySimpleKey(listenForButton);
        }
        function onSensorEnabled() {
            number_of_sensors_enabled += 1;
            if (number_of_sensors_enabled == number_of_sensors_to_enable) {
                console.log("All sensors enabled! Retrieving data...");
                initialiseDataRetrievalLoop();
            } else if (number_of_sensors_enabled > number_of_sensors_to_enable) {
                console.error("Number of sensors enabled exceeded limit! Please set the correct limit. Exiting.");
                tag.disconnect();
            }
        }

        function initialiseDataRetrievalLoop() {
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
                date = new Date();
                time = String(Math.floor(date.getTime()/1000));
                sensor_data.timestamp = time;
                //#############################################################
                //call business rules API to check for violations

                checkData(sensor_data.sensorObjectTemp, sensor_data.sensorGyroX, sensor_data.sensorGyroY, sensor_data.sensorGyroZ, app_XSRF, app_cookie);

                //#############################################################
                sendSensorData(sensor_data);
                setTimeout(loop, 5000); // schedule it again
            });
        }
        function listenForButton() {
            tag.on('simpleKeyChange', function (left, right) {
                if (left && right) {
                    tag.disconnect();
                }
            });
        }

        connectExecute();
    });

  //##################################################################
});


/******************************************************************/
/* FUNCTION to get Temperature from the Sensor & update into HANA */
/******************************************************************/
function sendSensorData(sensor_data_payload) {
    date = new Date();
    time = date.getTime();
    var data = { // initialise sensor data payload
        "mode": "sync",
        "messageType": messageTypeID,
        "messages": [ // sample message payload; will be overwritten by the program
            sensor_data_payload
        ]
    }
    var strData = JSON.stringify(data);
    if (DEBUG_VALUE)
        console.log("Data: " + strData);
    if (SHOULD_SEND_TO_SAP) {
        if (strData.length > 46) {
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
