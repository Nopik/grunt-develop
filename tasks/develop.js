
/**
 * @module grunt-develop
 * @author Edward Hotchkiss <edward@edwardhotchkiss.com>
 * @description http://github.com/edwardhotchkiss/grunt-develop/
 * @license MIT
 */

'use strict';

module.exports = function(grunt) {

  var child
    , running = false
    , fs = require('fs')
    , shouldRestart = false
    , util = require('util');

  //kills child process (server)
  grunt.event.on('develop.kill', function(ctx) {
    grunt.log.warn('kill process');
    child.kill( ctx.killSignal );
  });

  // starts server
  grunt.event.on('develop.start', function(ctx) {
    var spawnArgs = ctx.nodeArgs.concat([ctx.filename], ctx.args);
    if (running) {
      shouldRestart = true;
      return grunt.event.emit('develop.kill', ctx);
    }
    child = grunt.util.spawn({
      cmd: ctx.cmd,
      args: spawnArgs,
      opts: {
        env: ctx.env
      }
    }, function(){});
    // handle exit
    child.on('exit', function(code, signal) {
      running = false;
      if (signal !== null) {
        grunt.log.warn(util.format('application exited with signal %s', signal));
      } else {
        grunt.log.warn(util.format('application exited with code %s', code));
      }
      if( shouldRestart == true ){
        shouldRestart = false;
        grunt.event.emit('develop.start', ctx );
      }
    })
    .stdout.on('data', function(buffer) {
      grunt.log.write( ctx.logPrefix + String(buffer));
    });
    running = true;
    grunt.log.ok( ctx.logPrefix + util.format('started application "%s".', ctx.filename));

    //Trigger this exactly once per start
    setTimeout(function() {
     global.gruntDevelopDone();
    }, 250);
  });

  // TASK. perform setup
  grunt.registerMultiTask('develop', 'init', function() {
    var ctx = {
      filename: this.data.file,
      nodeArgs: this.data.nodeArgs || [],
      args: this.data.args || [],
      env: this.data.env || process.env || {},
      killSignal: this.data.killSignal || 'SIGKILL',
      logPrefix: this.data.logPrefix || '\r\n[grunt-develop] > '.cyan,
      cmd: this.data.cmd || process.argv[0]
    };

    if (!grunt.file.exists(ctx.filename)) {
      grunt.fail.warn(util.format('application file "%s" not found!', ctx.filename));
      return false;
    }
    global.gruntDevelopDone = this.async();
    grunt.event.emit('develop.start', ctx);
  });

  process.on('exit', function() {
    if (running) {
      child.kill('SIGINT');
    }
  });

};
