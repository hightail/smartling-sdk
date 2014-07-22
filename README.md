smartling-sdk
==========================

### NodeJS SDK for Smartling

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

Require it:

```
var SmartlingSdk = require("../smartling");

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

