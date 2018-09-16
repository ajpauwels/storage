TLS_PATH=../src/tests/tls
curl -vvv -XPOST -H "Content-Type: application/json" -E $TLS_PATH/tester.cert.pem --key $TLS_PATH/tester.key.pem --cacert $TLS_PATH/intermediate.root.cert.pem https://localhost:3002/users
