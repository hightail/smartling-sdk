/**
 * smartling-sdk
 * https://github.com/hightail/smartling-sdk
 *
 * Javascript SDK for Smartling. All functions are promise based using 'q' npm package
 *
 * Copyright (c) 2014 Hightail
 * Author: Justin Fiedler
 *
 * Date: 1/15/14
 */


var fs = require('fs'),
    path = require('path'),
    querystring = require('querystring'),
    mkdirp = require('mkdirp'),
    request = require('request'),
    Q = require('q'),
    _ = require('lodash');


/**
 * Returns a search (GET var) string based on the @jsonObject
 * Handles nested objects using dot notation
 *
 * ex:
 * {
 *    myParam: 'something',
 *    myOtherParam: {
 *      somethingElse: someValue
 *    }
 * }
 *
 * returns:
 * myParam=something&myOtherParam.somethingElse=someValue
 *
 *
 * @param jsonObject
 * @returns {string}
 */
var jsonToSearchParameterString = function(jsonObject) {
  var getParams = [];


  function _jsonToSearchParameterString(_jsonObject, prefix) {
    //loop over all keys in the object
    _.each(_jsonObject, function(value, key) {
      if (_.isObject(value)) {
        //if the value is an object recurse
        _jsonToSearchParameterString(value, key + '.');
      } else {
        //if the value is not an object then add it to the GET params
        getParams.push(prefix + key + '=' + encodeURIComponent(value));
      }
    });
  }

  _jsonToSearchParameterString(jsonObject, '');

  return getParams.join('&');
};

function handleSmartlingResponse(response, deferred) {
  var smartlingResponse = response.response;
  //console.log('smartlingResponse', smartlingResponse);
  if (smartlingResponse && smartlingResponse.code && smartlingResponse.code === 'SUCCESS') {
    deferred.resolve(smartlingResponse.data);
  } else {
    deferred.reject(response);
  }
}

function getStandardSmartlingRequestHandler(deferred) {
  return function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var data = body;
      if (_.isString(data)) {
        try {
          data = JSON.parse(body);
        } catch (err) {};
      }
      handleSmartlingResponse(data, deferred);
    } else {
      var errorObject = {
        message: "An unknown error occurred"
      };

      if (body && body.response) {
        errorObject = body.response;
      } else if (error) {
        errorObject = error;
      }

      deferred.reject(errorObject);
    }
  };
}

/**
 * Initializes Smartling with the given params
 *
 * @param baseUrl
 * @param apiKey
 * @param projectId
 */
var SmartlingSdk = function (apiBaseUrl, apiKey, projectId) {
  this.config = {
    apiBaseUrl: apiBaseUrl,
    apiKey:     apiKey,
    projectId:  projectId
  };
};

/**
 * Smartling API Base URL constants
 */
SmartlingSdk.API_BASE_URLS = {
  LIVE: 'https://api.smartling.com/v1',
  SANDBOX: 'https://sandbox-api.smartling.com/v1'
};

/**
 * Hash of available Smartling operations
 */
SmartlingSdk.OPERATIONS = {
  UPLOAD: '/file/upload',
  GET: '/file/get',
  LIST: '/file/list',
  STATUS: '/file/status',
  RENAME: '/file/rename',
  DELETE: '/file/delete'
};

/**
 * Returns a URL for a Smartling API Operation
 *
 * @param operation         A SmartlingSdk.OPERATIONS value
 * @param smartlingParams   JSON object containing any Smartling parameters
 * @returns {String}
 */
SmartlingSdk.prototype.getSmartlingRequestPath = function(operation, smartlingParams) {
  // The API key and projectId are always required so
  // provide default settings here
  var params = {
    apiKey: this.config.apiKey,
    projectId: this.config.projectId
  };

  _.extend(params, smartlingParams);

  //assemble the request URL
  var requestUrl = this.config.apiBaseUrl + operation;
  requestUrl += '?' + jsonToSearchParameterString(params);

  //console.log('requestUrl', requestUrl);

  return requestUrl;
};

/**
 * Uploads original source content to Smartling (20MB limit for docx and pptx, 10MB limit for all others).
 *
 * https://docs.smartling.com/display/docs/Files+API#FilesAPI-/file/upload(POST)
 *
 * @param file (required)  The file path or file contents to upload.
 * @param fileUri (required)  Value that uniquely identifies the uploaded file. This ID can be used to request the file back.
 *        We recommend you use file path + file name, similar to how version control systems identify the file.
 *        Example: /myproject/i18n/ui.properties.
 * @param fileType (required)
 *        Identifiers: android, ios, gettext, html, javaProperties, yaml, xliff, xml, json, docx, pptx, xlsx, idml
 * @param options (optional)
 * @param options.approved (optional)
 *        This value, either true or false (default), determines whether content in the file is 'approved' (available for translation)
 *        upon submitting the file via the Smartling Dashboard. An error message will return if there are insufficient translation
 *        funds and approved is set to true.
 *        Note: Setting this parameter to true both approves all new content and overrides any locale-specific or global exclusions.
 *        If your workflow includes content exclusions, use this parameter with caution.
 * @param options.smartling.[command] (optional)  Provides custom parser configuration for supported file types. See Supported File Types for more details.
 * @param options.callbackUrl (optional)  A GET request that creates a callback to a URL when a file is 100% published for a locale.
 *        The callback includes these parameters:
 *          fileUri
 *          locale
 *        If you upload another file without a callback URL, it will remove any previous callbackUrl for that file.
 *
 * @return {promise}
 */
SmartlingSdk.prototype.upload = function (filePath, fileUri, fileType, options) {
  //console.log('upload:filePath', filePath);
  //create a defered object to return
  var deferred = Q.defer();

  //setup default request params
  var smartlingParams = {
    fileUri: fileUri,
    fileType: fileType,
    approved: false
  };

  //extend the request params with any options passed in by user
  _.extend(smartlingParams, options);

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.UPLOAD, smartlingParams);

  fs.stat(filePath, function (err, stat) {
    if (err) {
      //failed to get file stats
      deferred.reject(err);
    } else {
      var req = request.post({
        url: requestUrl
      }, getStandardSmartlingRequestHandler(deferred));

      var form = req.form();
      form.append('file', fs.createReadStream(filePath));
    }
  });

  //return the promise
  return deferred.promise;
};

/**
 * Downloads the requested file (@fileUri) from Smartling.
 *
 * https://docs.smartling.com/display/docs/Files+API#FilesAPI-/file/get(GET)
 *
 * @param fileUri (required)  Value that uniquely identifies the downloaded file.
 *
 * @param options
 * @param options.locale (optional)  A locale identifier as specified in project setup. If no locale is specified, original content is returned. You can find the list of locales for your project on the Smartling dashboard at https://dashboard.smartling.com/settings/api.
 * @param options.retrievalType (optional)
 *          Allowed values: pending, published, pseudo
 *
 *          pending indicates that Smartling returns any translations (including non-published translations)
 *          published indicates that Smartling returns only published/pre-published translations
 *          pseudo indicates that Smartling returns a modified version of the original text with certain characters transformed and the text expanded. For example, the uploaded string "This is a sample string", will return as "T~hís ~ís á s~ámpl~é str~íñg". Pseudo translations enable you to test how a longer string integrates into your application.
 *          If you do not specify a value, Smartling assumes published.
 * @param options.IncludeOriginalStrings (optional) Allowed values: true, false  For gettext, xml, or json files only.
 *
 * @return {promise}
 */
SmartlingSdk.prototype.get = function (fileUri, filepath, options) {
  //create a defered object to return
  var defered = Q.defer();

  //setup default request params
  var smartlingParams = {
    fileUri: fileUri
  };

  //extend the request params with any options passed in by user
  _.extend(smartlingParams, options);

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.GET, smartlingParams);

  var requestParams = {
    url: requestUrl,
    json: true
  };

  //Make the request
  if (filepath) {
    mkdirp(path.dirname(filepath), function(err) {
      if (err) {
        console.log(err);
        defered.reject(err);
      } else {
        //create a new writestream for the file
        var fileStream = fs.createWriteStream(filepath);
        //handle any error writing to the stream
        fileStream.on('error', function(err) {
          defered.reject(error);
        });

        //create a request and pipe the response to a file
        var req = request.get(requestParams).pipe(fileStream);
        req.on('close', function(error) {
          if (error) {
            defered.reject(error);
          } else {
            defered.resolve();
          }
        });
      }
    });
  } else {
    request.get(requestParams, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        defered.resolve(body);
      } else {
        defered.reject(body);
      }
    });
  }


  //return the promise
  return defered.promise;
};

/**
 * Lists recently uploaded files. Returns a maximum of 500 files.
 *
 * https://docs.smartling.com/display/docs/Files+API#FilesAPI-/file/list(GET)
 *
 * @param options
 * @param options.locale (optional)  If not specified, the Smartling Files API will return a listing of the original files matching the specified criteria. When the locale is not specified, completedStringCount will be "0".
 * @param options.uriMask (optional)  SQL like syntax (ex '%.strings').
 * @param options.fileTypes (optional)  Identifiers: android, ios, gettext, javaProperties, xliff, yaml. File types are combined using the logical ‘OR’.
 * @param options.lastUploadedAfter (optional)
 *  Return all files uploaded after the specified date. See Date Format for more details.
 *  lastUploadedBefore (optional)  Return all files uploaded before the specified date. See  Date Format for more details.
 *  offset (optional)  For result set returns, the offset is a number indicating the distance from the beginning of the list; for example, for a result set of "50" files, you can set the offset at 10 to return files 10 - 50.
 *  limit (optional)  For result set returns, limits the number of files returned; for example, for a result set of 50 files, a limit of "10" would return files 0 - 10.
 *  conditions (optional)  An array of the following conditions: haveAtLeastOneUnapproved, haveAtLeastOneApproved, haveAtLeastOneTranslated, haveAllTranslated, haveAllApproved, haveAllUnapproved. Conditions are combined using the logical ‘OR’.
 * @param options.orderBy (optional)
 *  Choices: names of any return parameters; for example, fileUri, stringCount, wordCount, approvedStringCount, completedStringCount, lastUploaded and fileType. You can specify ascending or descending with each parameter by adding "_asc" or "_desc"; for example, "fileUri_desc". If you do not specify ascending or descending, the default is ascending.
 *
 * @returns {promise}
 */
SmartlingSdk.prototype.list = function (options) {
  //create a defered object to return
  var deferred = Q.defer();

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.LIST, options);

  var requestParams = {
    url: requestUrl,
    json: true
  };

  //Make the request
  request.get(requestParams, getStandardSmartlingRequestHandler(deferred));

  //return the promise
  return deferred.promise;
};

/**
 * Gets status of translations for @fileUri in @locale
 *
 * https://docs.smartling.com/display/docs/Files+API#FilesAPI-/file/status(GET)
 *
 * @param fileUri (required)  Value that uniquely identifies the file.
 * @param locale (required)  A locale identifier as specified in project setup.
 *               You can find the list of locales for your project on the Smartling
 *               dashboard at https://dashboard.smartling.com/settings/api.
 *
 * @returns {promise}
 */
SmartlingSdk.prototype.status = function (fileUri, locale) {
  //create a defered object to return
  var deferred = Q.defer();

  //setup default request params
  var smartlingParams = {
    fileUri: fileUri,
    locale: locale
  };

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.STATUS, smartlingParams);

  var requestParams = {
    url: requestUrl,
    json: true
  };

  //Make the request
  request.get(requestParams, getStandardSmartlingRequestHandler(deferred));

  //return the promise
  return deferred.promise;
};

/**
 * Renames an uploaded file @fileUri to @newFileUri. After renaming the file, the file will only be identified by the @newFileUri you provide.
 *
 * https://docs.smartling.com/display/docs/Files+API#FilesAPI-/file/rename(POST)
 *
 * @param fileUri (required)  Value that uniquely identifies the file to rename.
 * @param newFileUri (required) Value that uniquely identifies the new file. We recommend
 *        that you use file path + file name, similar to how version control systems identify
 *        the file. Example: /myproject/i18n/ui.properties.
 *        This must be a fileUri that does not exist in the Smartling database.
 *
 * @returns {promise}
 */
SmartlingSdk.prototype.rename = function (fileUri, newFileUri) {
  //create a defered object to return
  var deferred = Q.defer();

  //setup default request params
  var smartlingParams = {
    fileUri: fileUri,
    newFileUri: newFileUri
  };

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.RENAME, smartlingParams);

  var requestParams = {
    url: requestUrl,
    body: smartlingParams,
    json: true
  };

  //Make the request
  request.post(requestParams, getStandardSmartlingRequestHandler(deferred));

  //return the promise
  return deferred.promise;
};

/**
 * Removes the file from Smartling. The file will no longer be available for download.
 * Any complete translations for the file remain available for use within the system.
 *
 * Note: Smartling deletes files asynchronously and it typically takes a few minutes to complete.
 * While deleting a file, you can not upload a file with the same fileUri.
 *
 * @param fileUri (required)  Value that uniquely identifies the file.
 * @returns {promise}
 */
SmartlingSdk.prototype.delete = function (fileUri) {
  //console.log('_delete:', fileUri);
  //create a defered object to return
  var deferred = Q.defer();

  //setup default request params
  var smartlingParams = {
    fileUri: fileUri
  };

  //assemble the request URL
  var requestUrl = this.getSmartlingRequestPath(SmartlingSdk.OPERATIONS.DELETE, smartlingParams);

  var requestParams = {
    url: requestUrl,
    body: smartlingParams,
    json: true
  };

  //Make the request
  request.del(requestParams, getStandardSmartlingRequestHandler(deferred));

  //return the promise
  return deferred.promise;
};

//Export the SmartlingSdk Class
module.exports = SmartlingSdk;