const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadImage = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'ai-exam/questions',
      resource_type: 'image',
      transformation: options.transformation || [
        { width: 800, crop: 'limit' },
        { quality: 'auto' }
      ],
      ...options
    };

    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        reject(new Error('Lỗi upload hình ảnh'));
      } else {
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height
        });
      }
    }).end(fileBuffer);
  });
};

const uploadBase64Image = async (base64String, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'ai-exam/questions',
      resource_type: 'image',
      ...options
    };

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64String}`,
      uploadOptions
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw new Error('Lỗi upload hình ảnh');
  }
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

const getImageUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...transformations
  });
};

const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadBase64Image,
  deleteImage,
  getImageUrl,
  isCloudinaryConfigured
};
