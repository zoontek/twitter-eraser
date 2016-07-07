# twitter-eraser
A simple (and fast) script to delete old tweets.

![](https://dl.dropboxusercontent.com/u/4181800/twitter-eraser.png)

## Some simple steps

**1) Clone (or download) this repository**

```bash
git clone https://github.com/zoontek/twitter-eraser
cd twitter-eraser
```

**2) Install dependencies**

```bash
npm install
```

**3) Download your twitter archive**

- Consult the [twitter support](https://support.twitter.com/articles/20170160) for clear explanations
- Extract the archive, copy the `tweets.csv` file in the root folder

**4) Get twitter OAuth credentials**

- Go to the [Twitter app management](https://apps.twitter.com/) page, create a new app (or use an existing one)
- Fill the `config.json` file with your app *Consumer Key*, *Consumer Secret*, *Access Token* and *Access Token Secret*

**5) Tweak script `config.json`**

- `timeout_ms`: Request timeout, in ms (default: 15000)
- `keeped_tweets`: Number of tweets to keep (default: the 4000 latest)
- `concurrency`: Number of simultaneous requests. Don't push it too far to avoid server errors (default: 15)

**6) Run the script**

```bash
npm start
```
