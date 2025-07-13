![alt text](https://github.com/Lauri5/Toodle.git/frontend/src/assets/logo.svg "Toodle")

**Create stories together, powered by imagination and modern tech**

## 📖 Overview

**Toodle** is a cross-platform web and mobile application that blends the creativity of traditional storytelling board games with the interactive power of modern browser-based gaming. Inspired by games like *Rory’s Story Cubes* and *Once Upon a Time: The Storytelling Card Game*, Toodle lets friends co-create unique stories using only their imagination and a few digital tools.

Unlike the analog games it's inspired by, Toodle gives players the freedom to generate their own visual prompts through multiple input methods, making every session truly one of a kind.

## 🎮 How It Works

1. **Image Creation Phase**
   Players generate or upload images using one of the following methods:
   * Drawing directly on a canvas.
   * Uploading from local storage or the internet.
   * Using AI image generation via text prompts.

2. **Random Distribution**
   Once all images are collected, they are randomly assigned to players.

3. **Storytelling Phase**

   * The first player uses their image to kick off the story.
   * Each following player continues the narrative based on the image they receive.
   * The result is a fun, collaborative, and totally original story!

## 🛠️ Technologies Used

* **Frontend (Web):** React
* **Mobile App:** React Native
* **Backend:** Node.js and Automatic1111 stable diffusion.

## 📂 Repository Structure

```
/frontend         # React web application
/mobile            # React Native mobile application
/backend             # Backend for real-time game logic and communication
```

## 🚀 Getting Started

Clone the repository and run the appropriate client:

### Web

```bash
cd frontend
npm install
npm start
```

### Mobile

```bash
cd mobile
npm install
npx react-native run-android
```

### Server

```bash
cd backend
npm install
npm run start
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
