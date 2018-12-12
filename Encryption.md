# Overview

In order to use the dashboard you will need to generate and then reference in configuration files private and public keys. 
These keys are used for authentication (JWT) and HTTPS (TLS).
Technically you can generate and store them wherever you want as long as you configure them properly in each configuration files for `@a11ygato/dashboard` and `@a11ygato/webservice`.

For development, default files have been generated in `security` folder and might suits you. 
For production, you obviously need to generate everything again with your root certificate.

# Development

It contains:

- a couple of public and private keys for JWT authentication (jwt/pally.key.*)
- a couple of public and private keys for HTTPS (tls//pally.*)
- a certificate authority (tls//PCA.crt)

The `development` profile of each server is already configured for this name and location.

Then you should "install" the certificate authority into your machine.
I only know the procedure for macOS so I will only speak for this OS but the same procedure is possible on Linux and Windows.
For macOS just double click on it to add it to the keychain and then open it. Once open, in the "Trust" section, choose "Always trust".

The role of a certificate authority is to validate that you are who you say you are.
Which means that when you provide a TLS certificate to your browser this one will verify that it was delivered by a known and secured authority.
Of course, in development, we are using self-signed generated certificates which are not known by any valid certificate authority in the world.
That's why it is simpler to create your own certificate authority and add it to your list of valid authorities on your machine.

The gain is that chrome and firefox will not ask you anymore to confirm that you want to navigate to your dev server.

A [possible improvement](https://medium.com/@yash.kulshrestha/using-lets-encrypt-with-express-e069c7abe625) to avoid creating a custom certificate authority is probably to use let's encrypt.

## Good to know

- `pally.key` for JWT authentication has no pass phrase cause right now it is not handled by `@a11ygato/webservice`
- Pass phrase of `PCA.key` is a11ygato
- Challenge of `pally.csr` is a11ygato
- In `pally.ext`, I'm declaring two host names, one for production and one for development
    - For development, I'm using `pally` as alias for `127.0.0.1` (declared in `/etc/hosts`)
- Files ending with `.key` are private keys
- Files ending with `.pub` are public keys.
- Files ending with `.crt` are certificates. Their true extension is normally `.pem` but I found it more clear like that.
- Files ending with `.ext` are extension files, sort of configuration files for certificate generation.

**WARNING: these auto-generated keys are for development only! For production, you should create your own ones!**

# Production

Obviously you can't use something committed to a VCS for production.

# How to generate everything again?

So inside a `security` folder, let's create what we need.

```bash
mkdir security
cd security
mkdir jwt tls
```

## Authentication (JWT)

I am using RSA keys (public/private) for JWT authentication.

```sh
cd jwt
ssh-keygen -t rsa -b 4096 -C "pally"
```

You will be asked for a pass phrase. Please keep it empty cause right now `@a11ygato/webservice` doesn't handle pass phrases.

Then I transformed the public key in a second more compatible format:

```sh
ssh-keygen -e -m PKCS8 -f pally.key.pub > pally.pem
```

It corresponds to [RS256](https://github.com/auth0/node-jsonwebtoken#algorithms-supported) in jsonwebtoken dependency.

You should have in `jwt` three files:

- `pally.key` is a private key
- `pally.key.pub` is a public key
- `pally.pem` is the same as `pally.key.pub` in PEM format

## HTTPS (TLS)

```bash
cd ../tls
```

### CA

First we will generate our own certificate authority. The first step is to create a private key:

```bash
openssl genrsa -des3 -out PCA.key 2048
```

I named it PCA for Pally Certificate Authority. You will be prompted for a pass phrase.

Secondly we should generate the CA:

```bash
openssl req -x509 -new -nodes -key PCA.key -sha256 -days 1825 -out PCA.crt
```

The default file extension for certificate is `.pem` normally but I found it more clear to use the extension `.crt`.
Indeed, a PEM file is a container for many things and don't tell you what it is. Now we know its a certificate.

You will be asked a bunch of questions and the pass phrase of `PCA.key`, you may choose `pally` for the common name eventually.

In order to test it, I recommand not installing it right away in your system. When everything is done and configured, you should start pally
and verify that Chrome and Firefox ask you to confirm your navigation. After installing it, the confirmation should disappears.

To "install" the certificate authority into your machine:

- I only know the procedure for macOS so I will only speak for this OS but the same procedure is possible on Linux and Windows.
- For macOS just double click on it to add it to the keychain and then open it. Once open, in the "Trust" section, choose "Always trust".

### CA-Signed Certificate

Now that we have a root certificate or certificate authority, we can create new certificates signed by that authority.

The process is a bit similar. Let's create a new private key for for our coming certificate:

```bash
openssl genrsa -out pally.key 2048
```

Then we create a Certificate Signing Request (CSR) and answers a bunch of questions:

```bash
openssl req -new -key pally.key -out pally.csr
```

Now we have to create a configuration file `pally.ext` to define the Subject Alternative Name (SAN):

```
echo "authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = pally
DNS.2 = yourproductiondomain.com" > pally.ext
```

You can see that I'm declaring two host names:

- `pally`: is a local hostname that I put in my OS host file (/etc/hosts) and use for development instead of 127.0.0.1
- `yourproductiondomain.com`: is your server on production

It is an important step cause:

” RFC 2818 describes two methods to match a domain name against a certificate – using the available names within the subjectAlternativeName extension,
or, in the absence of a SAN extension, falling back to the commonName. The fallback to the commonName was deprecated in RFC 2818 (published in 2000),
but support still remains in a number of TLS clients, often incorrectly. — chromestatus.com „

It means that if you want to access your server from another domain not declared in this file your certificate will not be recognized.

Now we finally reuse everything we created to generate our app certificate.

```bash
openssl x509 -req -in pally.csr -CA PCA.crt -CAkey PCA.key -CAcreateserial -out pally.crt -days 1825 -sha256 -extfile pally.ext
```

If you encounter an obscure error `unable to write 'random state'` [this stackoverflow thread](https://stackoverflow.com/questions/94445/using-openssl-what-does-unable-to-write-random-state-mean?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa) helped me.

You should have in `tls` folder 7 files:

- PCA.crt
- PCA.key
- PCA.srl
- pally.crt
- pally.csr
- pally.ext
- pally.key

## Configuration

Of course, don't forget to modify your configuration files in each project (webservice and dashboard) in coherence with the place and name you chose for these files.
