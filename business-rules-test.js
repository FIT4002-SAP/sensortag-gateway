var request = require("request");
var fs = require("fs");

var XSRF = '';

var XSRFOptions = { method: 'GET',
  url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/xsrf-token',
  headers:
   { 'cache-control': 'no-cache',
     'x-csrf-token': 'Fetch',
     authorization: 'Basic Zml0NDAwMi5pbnRlbGxpZ2VuY2VAZ21haWwuY29tOjIwMThGSVQ0MDAyPw==' } };


//Get XSRF token from SAP
request(XSRFOptions, function (error, response, body) {
  if (error) throw new Error(error);

  XSRF = response.headers['x-csrf-token'];
  console.log("Achieved XSRF token from SAP = " + XSRF)
});

var businessRulesOptions = { method: 'POST',
  url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/invoke',
  qs: { rule_service_name: 'IoTManager::TemperatureService' },
  headers:
   { 'cache-control': 'no-cache',
     'content-type': 'application/json',
     'x-csrf-token': 'A6EDE204A5979EE1E1BC027B421C1CB5' },
  body: [
    {   _type_: 'IoTManagerDataObjects',
        Temperature: 55
    } ],
  json: true };

request(businessRulesOptions, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});

var notificationOptions = { method: 'POST',
  url: 'https://hcpms-p2000319942trial.hanatrial.ondemand.com/restnotification/application/com.sap.iot.manager/',
  headers:
   { 'Cache-Control': 'no-cache',
     Authorization: 'Basic Zml0NDAwMi5pbnRlbGxpZ2VuY2VAZ21haWwuY29tOjIwMThGSVQ0MDAyPw==',
     'Content-Type': 'application/json' },
  body:
   { alert: 'myass',
     data: 'please lord give me strength',
     sound: 'default' },
  json: true };

request(notificationOptions, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});