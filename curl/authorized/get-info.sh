echo "${@:2}"
curl -vvv -G -H "Content-Type: application/json" -E ~/tls/trusted-ca/intermediate/certs/ajp.intermediate.cert.pem --cacert ~/tls/trusted-ca/intermediate/certs/intermediate.root.cert.pem --key ~/tls/trusted-ca/intermediate/private/ajp.key.pem https://localhost:3002/users/info/$1 --data-urlencode "keys=${*:2}"
