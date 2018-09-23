# Storage ![Build status](https://travis-ci.com/ajpauwels/storage.svg?token=yLGqDzvQDsr99zpuEQbL&branch=master)

The storage components receives authenticated requests or submissions of encrypted data. At no point does it know the contents of the data, only its representative key. Bits of encrypted data are stored in a JSON-format matched to keys for easy retrieval.

Authentication is done via mutual TLS.
