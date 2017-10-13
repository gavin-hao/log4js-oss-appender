// const streams = require('streamroller');
const os = require('os')
    , path = require('path')
    , fs = require('fs');
const TimeRollingFileStream = require('./timeRollingFileStream').TimeRollingFileStream;
const oss = require('ali-oss');
const eol = os.EOL || '\n';
const format = require('date-format')
// /**
//  * File appender that rolls files according to a date pattern.
//  * @filename base filename.
//  * @pattern the format that will be added to the end of filename when rolling,
//  *          also used to check when to roll files - defaults to '.yyyy-MM-dd'
//  * @layout layout function for log messages - defaults to basicLayout
//  * @timezoneOffset optional timezone offset in minutes - defaults to system local
//  */
function appender(
    filename,
    rollingTime,
    logSize,
    layout,
    options,
    timezoneOffset
) {
    const logFile = new TimeRollingFileStream(
        filename,
        rollingTime,
        logSize,
        options
    );
    const ossClient = initOssClient(options)


    var uploading = false;
    //upload log files ,when the file rolled;
    logFile.on('rolled', () => {
        console.log('rolled');

        upload2Oss();
    })

    function upload2Oss() {
        if (!uploading) {
            uploading = true;
            _upload(() => {
                uploading = false;
            })
        }
        function _upload(cb) {
            walk(path.dirname(filename), [new RegExp(filename + '.\d*')], function (err, results) {
                if (!err && results && results.length > 0) {
                    console.log(results);
                    var pending = results.length;
                    results.forEach((v, i) => {
                        let key;
                        key = format.asString('yyyy-MM-dd', new Date()) + '/' + path.basename(v) + '-' + os.hostname().replace(/\//g, '_');
                        if (options.oss.basePath) {
                            key = options.oss.basePath.replace(/\/+$/, '') + '/' + key;
                        }
                        var result = ossClient.put(key, v).then((res) => {
                            // console.log('upload log file...  ' + key, res);
                            fs.unlink(v, function (err) {
                                //ignore err: if we could not delete, it's most likely that it doesn't exist
                                if (--pending <= 0) {
                                    return cb()
                                };
                            });
                        }).catch((err) => {
                            if (--pending <= 0) {
                                return cb()
                            };
                        });
                    })
                } else {
                    console.log('no log file ...  ');
                    return cb();
                }

            });

        }

    }

    //遍历文件夹，获取所有要上传的文件
    function walk(dir, pattern, done) {
        var results = [];

        fs.readdir(dir, function (err, list) {
            if (err) return done(err);

            var pending = list.length;
            if (!pending) return done(null, results);

            list.forEach(function (file) {
                file = path.join(dir, file);

                var included = false;
                var len = pattern.length;
                var i = 0;

                for (; i < len; i++) {
                    if (file.match(pattern[i])) {
                        included = true;
                    }
                }
                if (len <= 0) {
                    included = true;
                }
                //如果匹配,添加倒返回结果中
                if (included) {
                    results.push(file);
                    // Check if its a folder
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {

                            // If it is, walk again
                            walk(file, pattern, function (err, res) {
                                results = results.concat(res);

                                if (!--pending) { done(null, results); }

                            });
                        } else {
                            if (!--pending) { done(null, results); }
                        }
                    });
                } else {
                    if (!--pending) { done(null, results); }
                }

            });
        });
    };



    //先上传之前未上传的文件的文件
    upload2Oss();
    const app = function (logEvent) {

        logFile.write(layout(logEvent, timezoneOffset) + eol, 'utf8');
    };

    app.shutdown = function (complete) {
        logFile.write('', 'utf-8', () => {
            logFile.end(complete);
        });
    };

    return app;
}
function initOssClient(config) {
    var options = Object.assign({
        accessKeyId: 'your access key',
        accessKeySecret: 'your access secret',
        bucket: 'your bucket name',
        region: 'oss-cn-hangzhou'
    }, config.oss)
    // var store = oss(options);
    // return store;
    var OSS = oss.Wrapper;

    var client = new OSS(options);
    return client;
}
function configure(config, layouts) {
    let layout = layouts.basicLayout;

    if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
    }
    if (!config.logSize) {
        config.logSize = 0;
    }
    // if (!config.rollingTime) {
    //     config.rollingTime = 3600;
    // }
    // if (!config.alwaysIncludePattern) {
    //     config.alwaysIncludePattern = false;
    // }

    return appender(
        config.filename,
        config.rollingTime,
        config.maxLogSize,
        layout,
        config,
        config.timezoneOffset
    );
}


module.exports.configure = configure;