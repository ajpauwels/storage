TLS_PATH=../src/tests/tls
curl -G -H "Content-Type: application/json" -E $TLS_PATH/tester.cert.pem --cacert $TLS_PATH/intermediate.root.cert.pem --key $TLS_PATH/tester.key.pem https://localhost:3002/users/info --data-urlencode "keys=${*:1}" | jq '.'
