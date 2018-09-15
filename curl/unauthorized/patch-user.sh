TLS_PATH=../src/tests/tls
curl -vvv -XPATCH -H "Content-Type: application/json" -E $TLS_PATH/unsigned.cert.pem --key $TLS_PATH/unsigned.key.pem --cacert $TLS_PATH/intermediate.root.cert.pem --data @authorized/patch-user.json https://localhost:3002/users
