'use strict';

var path = require("path"),
    minimist = require("minimist"),
    expect = require('chai').expect,
    Replay = require("replay");

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

  var smartlingConfig = require(configPath);

  //Show the config so we know what we are testing against
  //console.log('Config File: ', configPath);
  //console.log(smartlingConfig);


  var TEST_UPLOAD_JSON_PATH = path.resolve(__dirname, './fixtures/translations.json');
  var TEST_UPLOAD_JSON_URI = 'translations.json';
  var TEST_UPLOAD_JSON_RENAME_URI = 'translations-renamed.json';

  var TEST_UPLOAD_JSON = require(TEST_UPLOAD_JSON_PATH);

  //Smartling isnt always fast
  this.timeout(10000);

  beforeEach(function(done){
    sdk = new SmartlingSdk(smartlingConfig.apiBaseUrl, smartlingConfig.apiKey, smartlingConfig.projectId);

    done();
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
        done(err);
      });
  });

  it('should upload a file', function(done){
    sdk.upload(TEST_UPLOAD_JSON_PATH, TEST_UPLOAD_JSON_URI, 'json')
      .then(function(response) {
        //console.log('response', response);
        expect(response.wordCount).to.equal(5);
        expect(response.stringCount).to.equal(2);
        done();
      })
      .fail(function(err) {
        done(err);
      });
  })

  it('should get status of a file', function(done){
    sdk.status(TEST_UPLOAD_JSON_URI)
      .then(function(response) {
        //console.log('response', response);
        expect(response.code).to.equal('SUCCESS');
        done();
      })
      .fail(function(err) {
        done(err);
      });
  });

  it('should get file from Smartling', function(done){
    sdk.get(TEST_UPLOAD_JSON_URI)
      .then(function(response) {
        //console.log('response', response);
        expect(response).to.deep.equal(TEST_UPLOAD_JSON);
        done();
      })
      .fail(function(err) {
        done(err);
      });
  });

  it('should rename a previously uploaded file', function(done){
    sdk.rename(TEST_UPLOAD_JSON_URI, TEST_UPLOAD_JSON_RENAME_URI)
      .then(function(response) {
        //console.log('response', response);
        expect(response.code).to.equal('SUCCESS');
        done();
      })
      .fail(function(err) {
        done(err);
      });
  });

  it('should remove a previously uploaded file', function(done){
    sdk.delete(TEST_UPLOAD_JSON_RENAME_URI)
      .then(function(response) {
        //console.log('response', response);
        expect(response.code).to.equal('SUCCESS');
        done();
      })
      .fail(function(err) {
        done(err);
      });
  })
});