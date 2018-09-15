TLS_PATH=../src/tests/tls
curl -vvv -G -H "Content-Type: application/json" -E $TLS_PATH/unsigned.cert.pem --cacert $TLS_PATH/intermediate.root.cert.pem --key $TLS_PATH/unsigned.key.pem https://localhost:3002/users/info/$1 --data-urlencode "keys=${*:2}"
