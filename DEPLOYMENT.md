# Sequential Raspberry Pi Deployment

This guide assumes you want the simplest private setup first:

- Telegram bot
- Only your Telegram user ID can use it
- Local files on the Raspberry Pi
- Optional online reasoning API
- Voice notes saved locally first
- Transcription added later as an optional step

## Phase 0: What You Need

Hardware:

- Raspberry Pi 4 or 5
- Raspberry Pi OS 64-bit
- Reliable internet connection
- SSD or good SD card

Accounts:

- Telegram account
- BotFather bot token

Base software needed on a clean Pi:

- `git`
- `curl`
- `ca-certificates`
- `nano`, or another editor
- Node.js 20 or newer
- `build-essential`, `cmake`, and extra tools only if you want voice transcription later

## Phase 1: Prepare A Clean Raspberry Pi

SSH into your Pi:

```bash
ssh pi@raspberrypi.local
```

Update the OS:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot
```

Reconnect after reboot:

```bash
ssh pi@raspberrypi.local
```

Install base tools:

```bash
sudo apt-get install -y git curl ca-certificates nano
```

Set the correct time zone:

```bash
sudo timedatectl set-timezone Asia/Singapore
timedatectl
```

Confirm the Pi clock is correct. Reminder delivery depends on system time.

Optional but recommended: change the default password if you have not already:

```bash
passwd
```

Optional but recommended: enable the firewall and allow SSH:

```bash
sudo apt-get install -y ufw
sudo ufw allow ssh
sudo ufw enable
sudo ufw status
```

## Phase 2: Install Node.js 20

Check if Node is already installed:

```bash
node --version
```

If it prints `v20.x` or newer, continue.

If Node is missing or older than version 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Confirm:

```bash
node --version
npm --version
```

## Phase 3: Create Your Telegram Bot

1. Open Telegram.
2. Search for `@BotFather`.
3. Send:

```text
/newbot
```

4. Choose a bot name, for example:

```text
My Private Secretary
```

5. Choose a bot username ending in `bot`, for example:

```text
my_private_secretary_bot
```

6. BotFather gives you a token like:

```text
1234567890:ABCDEF...
```

Keep this token private.

## Phase 4: Copy The Whole Project To Your Pi

Copy the entire project folder to the Raspberry Pi.

The Pi needs these files and folders:

```text
src/
src/skills/
config/
scripts/
package.json
.env.example
README.md
DEPLOYMENT.md
GIST.md
```

The Pi will create this folder later:

```text
data/
```

Do not copy a real `.env` file from a public/shared machine unless you are sure it contains only your own secrets.

### Option A: Clone From GitHub

Use this if the project is already in a GitHub repo.

If this project is in GitHub:

```bash
git clone https://github.com/gavinhon/priseclaw.git
cd priseclaw
```

### Option B: Download ZIP On The Pi

Use this if someone downloads the repository as a ZIP file.

Install unzip if needed:

```bash
sudo apt-get install -y unzip
```

Download the ZIP from GitHub:

```bash
wget https://github.com/gavinhon/priseclaw/archive/refs/heads/main.zip -O priseclaw.zip
unzip priseclaw.zip
mv priseclaw-main priseclaw
cd priseclaw
```

If the default branch is not `main`, replace `main.zip` and `priseclaw-main` with the correct branch name.

### Option C: Copy From Windows To The Pi

Use this from PowerShell on your Windows machine:

```powershell
scp -r C:\Projects\claws\priseclaw pi@raspberrypi.local:~/priseclaw
```

Then SSH into the Pi:

```bash
ssh pi@raspberrypi.local
cd ~/priseclaw
```

### Option D: Upload By FTP/SFTP

Use this if you have an FTP/SFTP client such as FileZilla, WinSCP, Cyberduck, or the file transfer feature in your SSH client.

Recommended destination on the Pi:

```text
/home/pi/priseclaw
```

If your Pi username is not `pi`, use:

```text
/home/<your-pi-username>/priseclaw
```

Upload the whole project folder contents into that directory.

You should upload:

```text
src/
src/skills/
config/
scripts/
package.json
.env.example
README.md
DEPLOYMENT.md
GIST.md
.gitignore
```

You do not need to upload:

```text
data/
.env
node_modules/
*.log
```

Create the destination folder on the Pi first if needed:

```bash
mkdir -p ~/priseclaw
```

After upload, SSH into the Pi and run:

```bash
cd ~/priseclaw
chmod +x scripts/*.sh
cp .env.example .env
nano .env
```

Then continue with Phase 6.

Make sure the scripts are executable:

```bash
chmod +x scripts/*.sh
```

## Phase 5: Create `.env`

Run:

```bash
cp .env.example .env
nano .env
```

Set:

```text
TELEGRAM_BOT_TOKEN=your_botfather_token_here
DISCOVERY_MODE=true
ALLOWED_TELEGRAM_USER_IDS=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
DATA_DIR=./data
BOT_TIMEZONE=Asia/Singapore
DAILY_BRIEFING_TIME=08:00
UPDATE_CHECK_INTERVAL_MINUTES=15
```

Save and exit.

In `nano`:

- `Ctrl+O` saves
- `Enter` confirms
- `Ctrl+X` exits

## Phase 6: Install Project Checks And Run Once

Run:

```bash
./scripts/install-rpi.sh
./scripts/run-rpi.sh
```

The bot starts in discovery mode.

Now message your Telegram bot from your own Telegram account:

```text
hello
```

The Pi terminal should print something like:

```text
Discovery: user_id=123456789 username=yourname chat_id=123456789
```

Copy the `user_id`.

Stop the bot:

```text
Ctrl+C
```

## Phase 7: Lock The Bot To Your User ID

Edit `.env` again:

```bash
nano .env
```

Change:

```text
DISCOVERY_MODE=false
ALLOWED_TELEGRAM_USER_IDS=123456789
```

Use your actual ID.

Save and exit.

Run again:

```bash
./scripts/run-rpi.sh
```

Test:

```text
help
```

If another Telegram user messages the bot, the bot will ignore them and write a local audit entry.

## Phase 8: Test Core Secretary Features

Send these messages to the bot:

```text
skills
```

The bot should list the registered skills.

```text
note Ben prefers email, not calls
```

Expected:

```text
Noted privately.
```

Then:

```text
remind me in 2 minutes check the bot
```

Expected:

```text
Reminder 1 saved for ...
```

After two minutes, the bot should send:

```text
Reminder 1: check the bot
```

Then:

```text
list reminders
```

And:

```text
done 1
```

Test recurring reminders:

```text
remind me every Monday at 9 review goals
```

Test local calendar:

```text
schedule lunch with Ben next Tuesday at 12
calendar
```

Test local search:

```text
search Ben
```

Test Obsidian-compatible Markdown export:

```text
export obsidian
```

Markdown files are written under:

```text
data/obsidian/
```

## Phase 9: Optional Online Reasoning API

The bot works without an online model, but it will understand more natural phrasing if you enable one.

Edit `.env`:

```bash
nano .env
```

Set:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Restart the manual bot run, or restart the service if already installed.

Privacy note: when this is enabled, the bot may send your message text or voice transcript to the online API for parsing. Local stored notes, reminder files, calendar files, and audio files remain on the Pi. The API request uses `store: false`.

## Phase 10: Install As A Background Service

Once the manual run works, stop it with `Ctrl+C`.

Then install the systemd service:

```bash
sudo ./scripts/install-service-rpi.sh
```

Check status:

```bash
sudo systemctl status priseclaw
```

View logs:

```bash
journalctl -u priseclaw -f
```

Restart after editing `.env`:

```bash
sudo systemctl restart priseclaw
```

Stop:

```bash
sudo systemctl stop priseclaw
```

## Phase 11: Backups

Your private bot data is stored in:

```text
data/
```

Back it up periodically:

```bash
tar -czf priseclaw-backup-$(date +%Y-%m-%d).tar.gz data .env
```

Store that backup somewhere encrypted if it contains sensitive notes.

## Phase 12: Optional Voice Note Transcription Dependencies

By default, voice notes are downloaded and saved locally. They are not transcribed unless you configure `whisper.cpp`.

Install build dependencies:

```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake git ffmpeg
```

Build `whisper.cpp`:

```bash
cd /opt
sudo git clone https://github.com/ggerganov/whisper.cpp.git
sudo chown -R "$USER:$USER" whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build -j
```

Download a model:

```bash
bash ./models/download-ggml-model.sh base.en
```

Edit your PriseClaw `.env`:

```bash
cd ~/priseclaw
nano .env
```

Set:

```text
WHISPER_CPP_BIN=/opt/whisper.cpp/build/bin/whisper-cli
WHISPER_MODEL_PATH=/opt/whisper.cpp/models/ggml-base.en.bin
FFMPEG_BIN=ffmpeg
```

Restart:

```bash
sudo systemctl restart priseclaw
```

Send a short Telegram voice note and check whether the bot responds based on the transcript.

### Voice Transcription Troubleshooting

If the voice note is only saved locally, check these in order.

1. Confirm the service loaded your latest `.env`:

```bash
cd ~/priseclaw
grep -E "WHISPER|FFMPEG" .env
sudo systemctl restart priseclaw
journalctl -u priseclaw -n 80
```

2. Confirm `ffmpeg` is installed:

```bash
which ffmpeg
ffmpeg -version
```

If missing:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

3. Confirm the whisper binary exists:

```bash
ls -l /opt/whisper.cpp/build/bin/whisper-cli
```

If that file does not exist, search for the actual binary:

```bash
find /opt/whisper.cpp -type f -name "whisper*"
```

Some builds may produce a different path. Update `WHISPER_CPP_BIN` in `.env` to the real path.

4. Confirm the model exists:

```bash
ls -lh /opt/whisper.cpp/models/ggml-base.en.bin
```

If missing:

```bash
cd /opt/whisper.cpp
bash ./models/download-ggml-model.sh base.en
```

5. Test transcription manually with one saved voice file:

```bash
cd ~/priseclaw
ls -lt data/audio
```

Pick the newest `.oga` or `.ogg` file, then run:

```bash
ffmpeg -y -i data/audio/<voice-file>.oga -ar 16000 -ac 1 -c:a pcm_s16le /tmp/priseclaw-test.wav
/opt/whisper.cpp/build/bin/whisper-cli -m /opt/whisper.cpp/models/ggml-base.en.bin -f /tmp/priseclaw-test.wav -otxt -of /tmp/priseclaw-test
cat /tmp/priseclaw-test.txt
```

If this manual command fails, fix `ffmpeg`, `WHISPER_CPP_BIN`, or `WHISPER_MODEL_PATH` before testing the bot again.

6. After any `.env` change, restart:

```bash
sudo systemctl restart priseclaw
journalctl -u priseclaw -f
```

## Phase 13: Optional Website, RSS, And GitHub Update Checks

Update checks add bounded autonomy. The bot only checks targets that you explicitly configure.

Edit:

```bash
nano config/update-checks.json
```

Supported check types:

- `website`
- `rss`
- `github`

Email checks are intentionally not included.

Example GitHub check:

```json
{
  "id": "priseclaw-github",
  "name": "PriseClaw GitHub main branch",
  "type": "github",
  "enabled": true,
  "repo": "gavinhon/priseclaw",
  "branch": "main",
  "mode": "commits",
  "intervalMinutes": 60
}
```

Example RSS check:

```json
{
  "id": "example-rss",
  "name": "Example RSS feed",
  "type": "rss",
  "enabled": true,
  "url": "https://example.com/feed.xml",
  "intervalMinutes": 60
}
```

Example website check:

```json
{
  "id": "example-website",
  "name": "Example website",
  "type": "website",
  "enabled": true,
  "url": "https://example.com",
  "intervalMinutes": 60
}
```

After editing:

```bash
sudo systemctl restart priseclaw
```

From Telegram:

```text
update checks
check updates now
```

The first run records a baseline. Later runs notify you when a fingerprint changes.

## Phase 14: Proactive Check-Ins

PriseClaw can start bounded conversations with you from local context.

Edit:

```bash
nano config/proactive.json
```

Example:

```json
{
  "enabled": true,
  "checkIns": [
    {
      "id": "morning-focus",
      "enabled": true,
      "time": "08:30",
      "prompt": "Ask what the user's top priority is today. Mention the next reminder or calendar event if there is one."
    }
  ],
  "staleReminderNudge": {
    "enabled": true,
    "time": "18:00",
    "minimumAgeHours": 24
  }
}
```

After editing:

```bash
sudo systemctl restart priseclaw
```

From Telegram:

```text
proactive status
proactive now
```

This is not unrestricted autonomy. It only talks to you at configured times and only uses local reminders, calendar events, notes, and configured update checks.

## Privacy Checklist

Before daily use:

- `DISCOVERY_MODE=false`
- `ALLOWED_TELEGRAM_USER_IDS` contains only your numeric Telegram ID
- `.env` is not uploaded publicly
- `data/` is not uploaded publicly
- `OPENAI_API_KEY` is set only if you accept sending message text/transcripts to the online API
- `config/update-checks.json` contains only sites, feeds, and repos you intentionally want monitored
- Pi login password is changed from default
- SSH is key-based if possible
- The bot is not placed in group chats

## Upgrade Path

Add features in this order:

1. Better natural-language reminder parsing
2. Recurring reminders
3. Local calendar file
4. Obsidian-compatible Markdown export
5. Voice transcription with `whisper.cpp`
6. Searchable local note and reminder history
7. Update check scripts for websites, RSS, or GitHub

Keep each addition local-first and allowlisted.

## Raspberry Pi Maintenance

Use these commands after the bot is installed as a systemd service.

### Check Bot Status

```bash
sudo systemctl status priseclaw
```

### Watch Live Logs

```bash
journalctl -u priseclaw -f
```

### Restart After Changing `.env`

```bash
sudo systemctl restart priseclaw
```

### Stop Or Start The Bot

```bash
sudo systemctl stop priseclaw
sudo systemctl start priseclaw
```

### Update The App From GitHub

If you cloned from GitHub:

```bash
cd ~/priseclaw
git pull
npm run check
sudo systemctl restart priseclaw
```

### Update The App When Using FTP/SFTP

If you uploaded files manually:

1. Stop the service:

```bash
sudo systemctl stop priseclaw
```

2. Upload the new versions of:

```text
src/
config/
scripts/
package.json
README.md
DEPLOYMENT.md
GIST.md
```

3. Do not overwrite these unless you intentionally want to replace your private data:

```text
.env
data/
```

4. SSH into the Pi and run:

```bash
cd ~/priseclaw
chmod +x scripts/*.sh
npm run check
sudo systemctl start priseclaw
```

### Back Up Private Data

Run this from the project folder:

```bash
cd ~/priseclaw
tar -czf ~/priseclaw-backup-$(date +%Y-%m-%d).tar.gz data .env
```

Copy the backup file off the Pi and store it somewhere private.

### Check Disk Usage

```bash
df -h
du -sh ~/priseclaw/data
du -sh ~/priseclaw/data/audio
```

Voice notes can grow over time. If you do not need old audio files, archive them first, then remove only files you are sure you no longer need.

### Keep The Pi Updated

Run occasionally:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot
```

After reboot:

```bash
sudo systemctl status priseclaw
```

### Health Check Routine

Weekly:

```bash
sudo systemctl status priseclaw
journalctl -u priseclaw -n 80
df -h
du -sh ~/priseclaw/data
```

Monthly:

```bash
cd ~/priseclaw
npm run check
tar -czf ~/priseclaw-backup-$(date +%Y-%m-%d).tar.gz data .env
```

### Recommended Folder Ownership

The app should live in your normal Pi user's home folder:

```text
/home/pi/priseclaw
```

The systemd service should run as that same user. Avoid running the bot as `root`.

## Clean Pi Dependency Summary

Required:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates nano
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Recommended:

```bash
sudo timedatectl set-timezone Asia/Singapore
sudo apt-get install -y ufw
sudo ufw allow ssh
sudo ufw enable
```

Optional for voice notes:

```bash
sudo apt-get install -y build-essential cmake git ffmpeg
```
