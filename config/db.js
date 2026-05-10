const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://admin:Admin12345!@vignesh-agency-cluster.5blsxe8.mongodb.net/?appName=vignesh-agency-cluster'
    );
    console.log('MongoDB Connected ✅');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;