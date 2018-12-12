To generate my root certificate (custom certificate authority), I followed [this guide](https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/).

- `.key` files are private keys.
- `.key.pub` files are public keys.
- `.crt` files are certificates. Their true extension is normally `.pem`.
- `.ext` files are extension files, sort of configuration file for certificates. 

Steps :

1. Generate a root certificate or custom authority (CA)
1. Generate a self signed project certificate against our custom CA
1. Configuration of each node server to use this certificate
1. Install custom CA in OS list of authorities

I met an issue on step 2, an obscure generic error. I resolved it by following [this thread](https://stackoverflow.com/questions/94445/using-openssl-what-does-unable-to-write-random-state-mean?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa) on SO. You just need to change some rights:

```bash
sudo chown <user>:<pwd> ~/.rnd
```

**WARNING: these auto-generated keys are for development only! For production, you should create your own ones! More info in [Encryption.md]**

[Encryption.md]: ../../Encryption.md
