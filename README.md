# Storage ![Build status](https://travis-ci.com/ajpauwels/storage.svg?branch=master)

The storage component receives authenticated requests or submissions of data. Data is stored in a JSON-format matched to keys for easy retrieval. In a production environment, this app would receives blobs of meaningless, encrypted data; however, for testing/development purposes, the cURL commands send plaintext information, not encrypted information. Since the storage app is hosted by a third party, it does not perform any encryption itself, it is the job of the app sending information to encrypt before-hand. This app is essentially just a dumb data-store.

Authentication is performed via mutual TLS.

### Requirements
1. You'll need NodeJS, preferably v8 or greater (that's what it was tested on).

2. To run the curl scripts for interacting with the component, you'll need cURL and jq installed. You can technically remove the jq processing from the cURL commands, but jq makes the output look much nicer.

### Setup
1. Clone this repository locally using `git clone git@github.com:ajpauwels/storage.git`

2. Enter the directory with `cd storage`

3. Run `npm install`

4. This app configures itself using environment variables, so let's make a folder to store an env file and place our environment variables in it: `mkdir env && touch ./env/local.env`

5. The storage component requires 4 environment variables to run, and has a further 2 optional environment variables. I've provided a mostly ready-to-go file below, the only exception being you'll need to provide your own MongoDB. I highly recommend using the services of [mLab](https://mlab.com), which will get you setup with a free, easily accessible MongoDB in about 5 minutes flat. Simply copy the code below to `./env/local.env` and load the env into your terminal window using `source ./env/local.env`.
```bash
export MONGODB_URL=mongodb://<username>:<password>@<URL to MongoDB>:<port>/<DB name>
export SERVER_KEY=./src/tests/tls/server.key.pem
export SERVER_CERT=./src/tests/tls/server.cert.pem
export SERVER_CA_CHAIN=./src/tests/tls/intermediate.root.cert.pem
export ZONE=dev
export PORT=3002
```

6. Run the app using `npm run watch-ts`

### Usage
You can communicate with the storage app using a simple REST interface. The cURL commands to do so are provided for you in the `curl` directory. Below I will outline how to create a new user, patch it with new information, and then request that information.

0. Before starting, know that you need to have cURL and jq installed on your machine. You can do so using the package manager that comes with your OS.

1. Navigate to the curl directory using `cd ./curl` from the root of the project.

2. In curl are two folders, authorized and unauthorized, which represent requests made from an authorized user and requests made from an unauthorized user, useful for testing. We'll be using the requests from the authorized folder, however do NOT `cd` into that folder, as the paths to the cert in the curl scripts are relative to `curl`, not `curl/authorized` or `curl/unauthorized`.

3. Run `./authorized/create-user.sh` to create a new user using TLS certificates provided in the `src/tests/tls` directory.

4. Run `./authorized/patch-user.sh` to add some stored information to your user. You can modify the `./authorized/patch-user.json` file to modify that data. Just make sure that you keep the root key `"info"` and all modifications are made to the object that is the value of that key.

5. Run `./authorized/get-info.sh` to retrieve all information stored for the user.

6. You can run `./authorized/get-info.sh firstNamespace.firstKey,secondNamespace` to get just the value of firstKey under firstNamespace, along with the value of secondNamespace. Individual values are comma-separated, paths are expressed using dot-notation.

### Unit tests
The package.json scripts look daunting but in fact follow a very simple pattern which ease testing various components of the app.

1. To simply run the tests and see if they pass, run `npm run test`.

2. To run the tests and get the code-coverage, run `npm run test+cov`.

3. To run just one test file, run `npm run test-some src/tests/path/to/test/file`.

4. To run just one test file and get the code coverage for that file, run `npm run test+cov-some src/tests/path/to/test/file`.

5. If a command has `watch-` prefixed to it, the command runs and then watches for changes in files in the project, re-running the command if a change is detected; very useful for development.

### Appendix A: Explanation of env variables
1. MONGODB\_URL: URL to a valid MongoDB instance containing username and password in the URL. Instead of going through the process of setting this up locally, I recommend grabbing a free database over at [https://mlab.com/](https://mlab.com). Disclaimer: I have no affiliation with mLab, I simply like what they offer.

2. SERVER\_KEY: Path to the private key used for mutual TLS communication. For testing purposes, you can use the pre-packaged TLS key provided in the test folder at `src/tests/tls/server.key.pem`.

3. SERVER\_CERT: Path to the public certificate that goes with the SERVER\_KEY. You can find one at `src/tests/tls/server.cert.pem`.

4. SERVER\_CA\_CHAIN: Chain of CAs going from the CA which signed the server cert up to a root CA recognized by the browser. You can find this at `src/tests/tls/intermediate.root.cert.pem`.

5. (Optional) ZONE: Feel free to specify a zone here for the purposes of deployment, such as dev, staging, prod, or test environment. This isn't currently used very much but will be used in the future to define log levels.

6. (Optional) PORT: Specify the port you want to run the app on. It currently defaults to 3000, although I usually define this variable to be 3002.
