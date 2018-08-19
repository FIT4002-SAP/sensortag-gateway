/* 	sensorTag IR Temperature sensor example
*  Craig Cmehil, SAP SE (c) 2015
*/

/* Choose the proper HTTP or HTTPS, SAP Cloud Platformrequires HTTPS */
var http = require('https');

var SensorTag = require('sensortag');
var lv_temp;
var lv_humid;
var lv_deviceid = "";
var DEBUG_VALUE = true;
var xtimestamp;
var date = new Date();
var time = date.getTime();
var SHOULD_SEND_TO_SAP = false;

// SAP Cloud Platform connection details
var portIoT = 443;
var pathIoT = '/com.sap.iotservices.mms/v1/api/http/data/';
var hostIoT = 'iotmmsXXXXXXXXXXtrial.hanatrial.ondemand.com';
var authStrIoT = 'Bearer XXXXXXXXXXXX';
var deviceId = 'XXXXXX-XXXX-XXXX-XXXX-XXXXXXXXX';
var messageTypeID = 'XXXXXXXXXXXX';

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
        console.log("Enabling sensors:");
        console.log('\tenableIRTemperatureSensor');
        tag.enableIrTemperature(notifyMe);
        console.log('\tenableHumidity');
        tag.enableHumidity(notifyMe);
        console.log("*********************************************");
        console.log(" To stop press both buttons on the SensorTag ");
        console.log("*********************************************");
    }

    function notifyMe() {
        tag.notifySimpleKey(listenForButton);
        setImmediate(function loop() {
            tag.readIrTemperature(function (error, objectTemperature, ambientTemperature) {
                lv_obj = objectTemperature.toFixed(1);
                lv_ambient = ambientTemperature.toFixed(1);
            });
            tag.readHumidity(function (error, temperature, humidity) {
                lv_temp = temperature.toFixed(1);
                lv_humid = humidity.toFixed(1);
            });
            if (DEBUG_VALUE)
                console.log("Sending Data: " + lv_deviceid + " " + lv_temp + " " + lv_humid);
            setSensorData(lv_temp, lv_humid);
            setTimeout(loop, 10000);
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
function setSensorData(lv_temp, lv_humid) {
    date = new Date();
    time = date.getTime();

    var data = {
        "mode": "sync",
        "messageType": messageTypeID,
        "messages": [{
            "timestamp": time,
            "temperature": lv_temp,
            "humidity": lv_humid
        }]
    };
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