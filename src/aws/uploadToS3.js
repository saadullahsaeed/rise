'use strict';

module.exports.UploadToS3 = function(s3, bucketResourceId, key, content) {
  return new Promise((resolve, reject) => {
    s3.upload({
      Bucket: bucketResourceId,
      Key: key,
      Body: content
    }, (err, data) => {
      if (err) {
        reject(err.message);
      } else {
        resolve(data);
      }
    });
  });
}
