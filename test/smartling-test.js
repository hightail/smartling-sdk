'use strict';

var path      = require("path"),
    fs        = require("fs"),
    minimist  = require("minimist"),
    expect    = require('chai').expect,
    Replay    = require("replay"),
    _         = require("lodash");

//change the fixtures directory
Replay.fixtures = path.join(__dirname, './fixtures/replay');

var SmartlingSdk = require("../smartling");

describe('SmartlingSdk', function() {
  var sdk;
  var args = minimist(process.argv, {
    '--': true
  });

  //Load configuration file
  var configPath = './config/unit.json';
  if (args.config) {
    configPath = args.config;
  }
  var testDelayMs = 0;
  if (args.delay) {
    testDelayMs = parseInt(args.delay);
  }

  var smartlingConfig = require(configPath);

  //Show the config so we know what we are testing against
  //console.log('Config File: ', configPath);
  //console.log(smartlingConfig);


  var TEST_UPLOAD_JSON_PATH = path.resolve(__dirname, './fixtures/translations.json');
  var TEST_UPLOAD_JSON_URI = 'translations.json';
  var TEST_UPLOAD_JSON_RENAME_URI = 'translations-renamed.json';
  var BAD_JSON_URI = 'bad-translations.json';
  var DOWNLOAD_FILE_PATH = path.resolve(__dirname, './download/translations.json');

  var TEST_UPLOAD_JSON = require(TEST_UPLOAD_JSON_PATH);

  //Smartling isnt always fast
  this.timeout(15000);

  //store a copy of the original Replay headers
  var origReplayHeaders = _.cloneDeep(Replay.headers);

  /**
   * Sets Replay.headers to work with POST requests.
   */
  function setupReplayHeadersForPOST() {
    //remove the 'body' and 'content-type' headers from pattern matching since the values
    //are unique on each POST request and will cause the unit tests to fail
    Replay.headers = [ /^accept/, /^authorization/, /^host/, /^if-/, /^x-/ ];
  }

  /**
   * Restores Replay.headers to the default
   */
  function restoreReplayHeaders() {
    Replay.headers = origReplayHeaders;
  }

  //TODO: Ideally we shouldnt need to run this globally. See comments in the upload test
  setupReplayHeadersForPOST();

  beforeEach(function(done){
    sdk = new SmartlingSdk(smartlingConfig.apiBaseUrl, smartlingConfig.apiKey, smartlingConfig.projectId);

    done();
  });

  afterEach(function(done){
    //For integration testing Smartling will sometimes stop accepting requests if you make too many too fast
    //setting the --delay option to sometime like 1000 ms will prevent Smartling from crapping out
    if (testDelayMs > 0) {
      //console.log('delaying ' + testDelayMs);
      setTimeout(function() {
        done();
      }, testDelayMs);
    } else {
      done();
    }
  });

  it('should get a list of files', function(done){
    sdk.list()
      .then(function(response) {
        expect(response.hasOwnProperty('fileCount')).to.equal(true);
        expect(response.hasOwnProperty('fileList')).to.equal(true);
        expect(response.fileCount).to.equal(response.fileList.length);
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should upload a file', function(done){
   sdk.upload(TEST_UPLOAD_JSON_PATH, TEST_UPLOAD_JSON_URI, 'json')
      .then(function(uploadInfo) {
        expect(uploadInfo.wordCount).to.equal(5);
        expect(uploadInfo.stringCount).to.equal(2);
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should upload a file with custom options', function(done){
    sdk.upload(TEST_UPLOAD_JSON_PATH, TEST_UPLOAD_JSON_URI, 'json', {
        "smartling": {
          "placeholder_format_custom": "__.+?__"
        }
      })
      .then(function(uploadInfo) {
        expect(uploadInfo.wordCount).to.equal(5);
        expect(uploadInfo.stringCount).to.equal(2);
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should get status of a file', function(done){
    //TODO: We should setup/teardown the Replay headers for POST here instead of at the top of all the tests
    //However this causes errors. So I need to do it at the top instead
    //setupReplayHeadersForPOST();
    sdk.status(TEST_UPLOAD_JSON_URI, 'en')
      .then(function(statusInfo) {
        //restoreReplayHeaders();
        //console.log('response', response);
        expect(statusInfo.fileUri).to.equal(TEST_UPLOAD_JSON_URI);
        expect(statusInfo.fileType).to.equal('json');
        done();
      })
      .fail(function(err) {
        //restoreReplayHeaders();
        console.log(err);
        done(false);
      });
  });

  it('should get a file from Smartling', function(done){
    sdk.get(TEST_UPLOAD_JSON_URI)
      .then(function(response) {
        //console.log('response', response);
        expect(response).to.deep.equal(TEST_UPLOAD_JSON);
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should download a file from Smartling', function(done){
    sdk.get(TEST_UPLOAD_JSON_URI, DOWNLOAD_FILE_PATH)
      .then(function() {
        fs.exists(DOWNLOAD_FILE_PATH, function(exists) {
          if (exists) {
            //make sure the contents match what we uploaded
            var downloadedFileContents = require(DOWNLOAD_FILE_PATH);
            expect(downloadedFileContents).to.deep.equal(TEST_UPLOAD_JSON);

            //delete the donwloaded file
            fs.unlinkSync(DOWNLOAD_FILE_PATH);

            done();
          } else {
            //file failed to download
            done('File failed to save to: ' + DOWNLOAD_FILE_PATH);
          }
        })
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should rename a previously uploaded file', function(done){
    sdk.rename(TEST_UPLOAD_JSON_URI, TEST_UPLOAD_JSON_RENAME_URI)
      .then(function() {
        //rename returns nothing on success
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should remove a previously uploaded file', function(done){
    sdk.delete(TEST_UPLOAD_JSON_RENAME_URI)
      .then(function() {
        //delete returns nothing on success
        done();
      })
      .fail(function(err) {
        console.log(err);
        done(false);
      });
  });

  it('should fail to get status of a file that does not exist', function(done){
    sdk.status(BAD_JSON_URI, 'en')
      .then(function(statusInfo) {
        //this call should fail
        done(false);
      })
      .fail(function(error) {
        expect(error.code).to.equal('VALIDATION_ERROR');
        done();
      });
  });
});