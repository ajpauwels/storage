curl -vvv -XPOST -H "Content-Type: application/json" -E ~/tls/trusted-ca/intermediate/certs/ajp.cert.pem --key ~/tls/trusted-ca/intermediate/private/ajp.key.pem https://localhost:3002/users
