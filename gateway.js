/* 	sensorTag IR Temperature sensor example
*  Craig Cmehil, SAP SE (c) 2015
*/

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
    sensorAccX: 0.01,
    sensorAccY: 0.01,
    sensorAccZ: 30.0,
    sensorBarometric: 1002.0,
    sensorGyroX: -1.0,
    sensorGyroY: -1.0,
    sensorGyroZ: -1.0,
    sensorHumidity: 20.0,
    sensorMagX: 29.68,
    sensorMagY: 10.79,
    sensorMagZ: -10.79,
    sensorObjectTemp: 16.47,
    sensorOptical: "1000",
    sensorTemp: 22.12
}
var lv_temp;
var lv_humid;
var lv_optical;
var lv_objectTemp;
var lv_bar;
var lv_accx;
var lv_accy;
var lv_accz;
var lv_gyrox;
var lv_gyroy;
var lv_gyroz;
var lv_magx;
var lv_magy;
var lv_magz;
var lv_deviceid = "";
var number_of_sensors_enabled = 0;
var number_of_sensors_to_enable = 7;
// END SENSOR DATA
var DEBUG_VALUE = true;
var xtimestamp;
var date = new Date();
var time = date.getTime();
var SHOULD_SEND_TO_SAP = false;

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
            tag.readMagnetoMeter(function (error, x, y, z) {
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
            time = date.getTime();
            sensor_data.timestamp = time;
            // send it
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
                    if (DEBUG_VALUE)
                        console.log("REQUEST END:", response.statusCode);
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