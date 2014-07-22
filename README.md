smartling-sdk
==========================

# NodeJS SDK for Smartling

Promised based SDK for the [Smartling Translation API](https://docs.smartling.com/display/docs/Smartling+Translation+API)

Supported functions:
* list
* status
* get
* upload
* rename
* delete

## How to use smartling-sdk

Install smartling-sdk:

```
$ npm install smartling-sdk
```

Require and use it:

```
var SmartlingSdk = require("smartling-sdk");

//Create a new sdk object with your Smartling information
var sdk = new SmartlingSdk(SmartlingSdk.API_BASE_URLS.SANDBOX, 'your-smartling-api-key', 'your-smartling-project-id');

// Get a list of available files
sdk.list()
  .then(function(response) {
    console.log(response);
  })
  .fail(function(err) {
    // an error has occurred
  });

// Upload a file
sdk.upload('./path/to/some-file.json', 'some-file', 'json')
  .then(function(response) {
    // File uploaded successfully
    console.log(response);
  })
  .fail(function(err) {
    // an error has occurred
  });

// Get a status of a file
sdk.status('some-file')
  .then(function(statusInfo) {
    console.log(statusInfo);
  })
  .fail(function(err) {
    // an error has occurred
  });


// Get a file
sdk.get('some-file')
  .then(function(fileContents) {
    // File retrieved successfully
    console.log(fileContents);
  })
  .fail(function(err) {
    // an error has occurred
  });

// Rename a file
sdk.rename('some-file', 'some-file-with-a-new-name')
  .then(function(response) {
    //File renamed successfully
  })
  .fail(function(err) {
    //an error has occurred
  });

// Delete a file
sdk.rename('some-file-with-a-new-name')
  .then(function(response) {
    //File deleted successfully
  })
  .fail(function(err) {
    //an error has occurred
  });
```

## How to test smartling-sdk

###Unit testing
Unit tests run against prerecorded API responses via [node-replay](https://github.com/assaf/node-replay). Unit test configuration is located in ~/test/config/unit.json.
```
npm test
```

###Integration testing
First you will need to add your apiKey and projectId to ~/test/config/integration.json

```
{
  "apiBaseUrl": "https://sandbox-api.smartling.com",
  "apiKey":     "your-api-key",
  "projectId":  "your-project-id"
}
```

Then you can run the integration script:
```
npm run integration
```

