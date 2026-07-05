const fs = require('fs');

// 윈도우 exFAT 파일 시스템 및 특정 Node.js 버전에서 
// 일반 파일에 fs.readlink() 시도 시 EISDIR 에러가 나는 버그를 
// 웹팩/Next.js가 정상 인식하도록 EINVAL 에러로 교정해주는 패치 스크립트입니다.

const originalReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  originalReadlink(path, options, (err, linkString) => {
    if (err && err.code === 'EISDIR') {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      newErr.code = 'EINVAL';
      newErr.errno = -4071;
      return callback(newErr);
    }
    callback(err, linkString);
  });
};

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return originalReadlinkSync(path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      newErr.code = 'EINVAL';
      newErr.errno = -4071;
      throw newErr;
    }
    throw err;
  }
};

if (fs.promises && fs.promises.readlink) {
  const originalPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = function (path, options) {
    return originalPromisesReadlink(path, options).catch((err) => {
      if (err && err.code === 'EISDIR') {
        const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
        newErr.code = 'EINVAL';
        newErr.errno = -4071;
        throw newErr;
      }
      throw err;
    });
  };
}
