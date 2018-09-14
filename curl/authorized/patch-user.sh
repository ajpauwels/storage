FILEDIR=$(dirname "$0")
curl -vvv -XPATCH -H "Content-Type: application/json" -E ~/tls/trusted-ca/intermediate/certs/ajp.cert.pem --key ~/tls/trusted-ca/intermediate/private/ajp.key.pem --data @"$FILEDIR"/patch-user.json https://localhost:3002/users
