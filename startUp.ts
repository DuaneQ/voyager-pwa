// Import the Secret Manager client library
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Create a client
const client = new SecretManagerServiceClient();
console.log('client', client)

//'projects/YOUR_PROJECT_ID/secrets/API_KEY/versions/latest',
async function accessSecretVersion() {
  const [version] = await client.accessSecretVersion({
    name: 'projects/533074391000/secrets/APP_ID',
  });

  // Extract the payload as a string
  const payload = version.payload.data.toString('utf8');
  // Store the payload in an environment variable
  process.env.APP_ID = payload;
  console.log(`Payload: ${payload}`);
  return payload;
}

// Use the secret in your application
accessSecretVersion().then(apiKey => {
  // Use the apiKey in your application
  console.log(`API Key: ${apiKey}`);
});