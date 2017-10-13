const streams = require('streamroller');
var DateRollingFileStream = streams.DateRollingFileStream
  , util = require('util')
  , format = require('date-format')
  , fs = require('fs');

/**
 * 
 * @param {string} filename 
 * @param {string} pattern 
 * @param {number} size 
 * @param {number} interval , seconds to roll
 * @param {object} options   
 **/
function TimeRollingFileStream(filename, interval, size, options) {
  if (interval <= 0 || !interval) {
    interval = 0;
  }
  this.interval2Roll = interval * 1000;//default 15min
  this.lastWroteTime = findTimestampFromFileIfExists(filename)
  this.maxSize = size || Number.MAX_SAFE_INTEGER;

  if (this.maxSize <= 0) {
    this.maxSize = 0;
  }
  let pattern = options.pattern||'.yyyyMMddhhmmss';
  // if (interval == 0) {
  //   pattern = options.pattern;//如果不设置归档间隔，根据 pattern 配置归档文件
  // }
  TimeRollingFileStream.super_.call(this, filename, pattern, options);
}
util.inherits(TimeRollingFileStream, DateRollingFileStream);


function findTimestampFromFileIfExists(filename) {
  return fs.existsSync(filename) ? fs.statSync(filename).mtime.getTime() : Date.now();
}

TimeRollingFileStream.prototype.shouldRoll = function () {
  if (this.interval2Roll > 0) {
    var lastTime = this.lastWroteTime,
      thisTime = Date.now();
    this.lastWroteTime = thisTime;
    this.previousTime = lastTime;
    if (this.maxSize > 0 && this.currentSize >= this.maxSize) {
      return true;
    }
    return (thisTime - lastTime) >= this.interval2Roll;
  } else {
    var lastTime2 = this.lastTimeWeWroteSomething,
      thisTime2 = format.asString(this.pattern, new Date(this.now()));



    this.lastTimeWeWroteSomething = thisTime2;
    this.previousTime = lastTime2;

    return thisTime2 !== lastTime2;
  }

}
TimeRollingFileStream.prototype.roll = function (filename, callback) {
  var that = this;

  that.emit('rolling');
  var newFilename = '';
  if (typeof this.previousTime == 'number') {
    newFilename = this.baseFilename + format.asString(this.pattern, new Date(this.previousTime));
  } else {
    newFilename = this.baseFilename + this.previousTime;
  }
  this.closeTheStream(
    deleteAnyExistingFile.bind(null,
      renameTheCurrentFile.bind(null,
        this.compressIfNeeded.bind(this, newFilename,
          this.removeOldFilesIfNeeded.bind(this,
            this.openTheStream.bind(this, emitRolledEvent.bind(this, callback)))))));
  function emitRolledEvent(cb) {
    that.emit('rolled');
    return cb();
  }
  function deleteAnyExistingFile(cb) {
    //on windows, you can get a EEXIST error if you rename a file to an existing file
    //so, we'll try to delete the file we're renaming to first
    fs.unlink(newFilename, function (err) {

      //ignore err: if we could not delete, it's most likely that it doesn't exist
      cb();
    });
  }

  function renameTheCurrentFile(cb) {
    fs.rename(filename, newFilename, cb);
  }
};

exports.TimeRollingFileStream = TimeRollingFileStream;