var request = require("request");
var fs = require("fs");

var XSRF = '';

var XSRFOptions = { method: 'GET',
  url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/xsrf-token',
  headers:
   { 'cache-control': 'no-cache',
     'x-csrf-token': 'Fetch',
     authorization: 'Basic Zml0NDAwMi5pbnRlbGxpZ2VuY2VAZ21haWwuY29tOjIwMThGSVQ0MDAyPw==' } };


//Get XSRF token from SAP - Call business rules API with the values
request(XSRFOptions, function (error, response, body) {
  if (error) throw new Error(error);

  XSRF = response.headers['x-csrf-token'];
  cookie = response.headers['set-cookie'];
  console.log("Achieved XSRF token from SAP = " + XSRF);

    var options = { method: 'POST',
      url: 'https://bpmrulesruntimebpm-p2000319942trial.hanatrial.ondemand.com/rules-service/v1/rules/invoke',
      qs: { rule_service_name: 'IoTManager::TemperatureService' },
      headers:
       { 'Postman-Token': '2d50c515-d621-4a76-aae3-b3e42c36a7a7',
         'Cache-Control': 'no-cache',
         Authorization: 'Basic Zml0NDAwMi5pbnRlbGxpZ2VuY2VAZ21haWwuY29tOjIwMThGSVQ0MDAyPw==',
         'Content-Type': 'application/json',
         'X-CSRF-Token': XSRF,
          'Cookie': cookie},
      body:
       [ { __type__: 'IoTManagerDataObjects',
           Temperature: 200,
           GyroX: 55,
           GyroY: 55,
           GyroZ: 55 } ],
      json: true };
    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      console.log(body);
    });
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
/*
request(notificationOptions, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});*/