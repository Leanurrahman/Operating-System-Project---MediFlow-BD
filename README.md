# MediFlow BD 🚑✨

A State-of-the-Art Full-Stack Healthcare Emergency Response Orchestration Platform designed for Bangladesh (Dhaka). It optimizes emergency response by integrating **Real-Time Spatial Map Tracking**, **Interactive Cloud Chat Systems**, and **Core Operating Systems (OS) CPU Scheduling & Deadlock Avoidance Algorithms** to solve real-world emergency dispatching and critical ICU resource constraints.

---

## 📌 Project Overview
In densely populated metropolitan areas like Dhaka, traffic congestion, lack of real-time communication coordinates, and delayed transport dispatch are major factors leading to high casualty rates in medical emergencies. **MediFlow BD** bridges the critical gap between patients, emergency ambulance operators, and hospital resource admins.

By transforming administrative scheduling queues into active **Operating System Scheduling simulations** (such as FCFS, SJF, Priority-based Scheduling with Aging, and the Banker's Algorithm for ICU resource allocation), MediFlow BD proves how computational OS concepts can directly optimize real-world life-saving activities.

---

## ❓ Problem Statement
Typical emergency response channels suffer from three primary bottlenecks:
1. **Inefficient Dispatching Queues**: Static dispatch systems fail to prioritize cardiac or respiratory emergencies over less severe injuries, resulting in starvation of critical patients.
2. **ICU & Resource Deadlocks**: Hospitals blindly allocate limited resources (Oxygen, ICU/CCU Beds, Blood Bags) without checking safe states, leading to system bottlenecks (deadlocks) where patients cannot be triaged.
3. **No Centralized Coordinates**: Patients cannot track their dispatched ambulances, and ambulance operators cannot coordinate with hospital rooms.

---

## 🚀 Key Features

* **SOS Emergency Dispatch Engine**: Single-click instantaneous emergency requests with severe-level auto-detection.
* **Live Emergency Map Tracker**: Real-time Interactive Leaflet map showing real-time geographical coordinates of Patients, Dispatched Ambulances, and Clinic Hubs in Dhaka.
* **OS CPU Scheduling Simulation Arena**: Live playground and back-end logic executing historical queuing models on live medical dispatches to evaluate efficiency.
* **ICU Deadlock Checker (Banker's Algorithm)**: Real-time resource check utility preventing allocation failures for blood types, oxygen canisters, and ICU suites.
* **Bi-directional Emergency Chat**: Real-time secure messaging channel linking patients with assigned paramedics/operators and emergency hubs.
* **Resource and Supply inventory**: Live counters tracking blood supply, essential medicines, and active hospital bed availability.
* **Blood Donor Matching**: Database search engine pairing active blood donors with critical request queues based on geographic proximity.

---

## 👥 Integrated User Roles

### 🧑‍⚕️ 1. Patient / User
* Submit instantaneous SOS requests with location and symptoms.
* Track dispatched response vehicles live on a Dhaka interactive map grid.
* Chat directly with the paramedic team/operator.
* Order critical emergency medicines from localized medical reserves.
* Search and coordinate with matched live blood donor volunteers.

### 🚒 2. Ambulance Operator
* Manage vehicle status profiles (Active, Standard Dispatch, Out of Service).
* Receive patient dispatch coordinates.
* Interactive map tracking for optimal route planning.
* Secure chat client connected to patient dashboard and hospital rooms.

### 👑 3. System & Hospital Admin
* Real-time monitoring of active emergency incidents.
* Override scheduling queues manually or dispatch custom services.
* Coordinate ICU bed allocations and utilize the Banker's Algorithm simulator to prevent hospital inventory locks.
* Manage registered ambulance rosters and blood donor databases.

---

## 🧠 Core OS Concepts Implemented

To demonstrate computer science theory inside clinical workflow, the scheduling systems utilize primary Operating System concepts:

1. **First-Come, First-Served (FCFS)**
   * Chronological ambulance routing. Patients are served strictly in the order of their SOS request submission timestamp.
2. **Shortest Job First (SJF) & Shortest Remaining Time First (SRTF)**
   * Dispatches ambulances based on the shortest predicted transit time, minimizing overall average patient wait time in the system during high-congestion periods.
3. **Priority Scheduling (Triage Categories)**
   * Emergency requests are separated into high-priority classes (Red: priority 1, Yellow: priority 2, Green: priority 3) based on case severity. High-severity requests preemptively jump to the front of the queue.
4. **Aging & Starvation Prevention**
   * Programmatically prevents low-severity triage cases (Green / Level 3) from being permanently postponed (starving) by incrementing their priority level progressively as they wait in the queue.
5. **Round Robin (RR)**
   * Time-slice multiplexing applied to patient virtual chat interactions and continuous telemetry updates to ensure all clients receive equitable polling processing bandwidth.
6. **Banker's Algorithm (Deadlock Avoidance)**
   * Models the state of critical ICU resources (Blood Units, Oxygen Cylinders, ICU Suites) to evaluate maximum theoretical demand. Prior to resource assignment, the allocator runs safety checks to ensure a deadlock state is impossible.

---

## 🛠️ Technology Stack

* **Frontend**: React.js (Vite, Tailwind CSS, Framer Motion for premium, modern high-contrast interface components)
* **Realtime and Storage**: Firebase (Firestore, Realtime client event streams, secure auth validation, rule structures)
* **Spatial Tracking**: Leaflet API, OpenStreetMap React wrappers
* **State & Communication**: React Context Providers, custom onSnapshot real-time bindings.

---

## 📂 Project Directory Structure

```text
├── firestore.rules             # Secure, defined cloud database read/write permissions
├── firebase-blueprint.json     # Initial database schema layout
├── .env.example                # Template of environment variables for simple system setup
├── package.json                # Project script execution rules and dependencies list
├── src/
│   ├── main.tsx                # Main application bootstraper
│   ├── App.jsx                 # Entry root application router and primary state listener
│   ├── index.css               # Global Tailwind CSS configurations
│   ├── context/
│   │   └── AuthContext.jsx     # Decoupled Firebase Auth state provider and state manager
│   ├── components/
│   │   └── EmergencyChatSystem.jsx # Fully integrated real-time text consultation module
│   └── pages/
│       ├── PatientDashboard.jsx   # Dedicated Patient console (SOS inputs, Map visualizer)
│       ├── AmbulanceDashboard.jsx # Dispatched Operator console and routing grid
│       ├── HospitalAdmin.jsx      # Heavy orchestration portal featuring OS algorithm sims
│       └── Auth.jsx               # Safe authentication and onboarding workspace
```

---

## 🔌 Installation & Local Execution Guide

Follow these steps to configure your environment and run MediFlow BD locally on VS Code:

### 📋 Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (Version 18.x or later recommended)
* [Git](https://git-scm.com/) (For cloning or managing versions)

### 🚀 Setup Steps

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd mediflow-bd
   ```

2. **Install Dependencies**
   Install the pre-configured project packages:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a local configuration environment file `.env` inside your root directory. Copy the contents from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Open the newly created `.env` file and insert your Firebase configuration credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```

4. **Launch the Development Server**
   Start the local dev process:
   ```bash
   npm run dev
   ```
   The local terminal will output the local network URL. Open `http://localhost:3000` inside your master browser to preview.

---

## 🔥 Firebase Database Configuration Note

To ensure real-time persistence functions flawlessly:
1. Initialize a **Google Cloud Firebase Project** on the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** in Test/Production Mode.
3. Enable **Firebase Authentication** with Email/Password Provider.
4. Copy the project credentials from your Firebase settings dashboard into your local `.env`.
5. Upload or save the security definitions from `firestore.rules` inside your Firebase Console's rule panel to allow open database queries during project evaluations.

---

## 🌐 Production Deployment Guide

### 📂 1. Pushing your project to GitHub
To push changes to your personal GitHub repository for presentation:
```bash
# Initialize git if not done
git init

# Add remote repository
git remote add origin <your-github-repo-url>

# Stage and commit clean code files
git add .
git commit -m "feat: MediFlow BD final presentation ready"

# Push to your primary branch
git push -u origin main
```

### ⚡ 2. Deploying on Vercel or Netlify
Since MediFlow BD is built on Vite, compiling it into static asset files is seamless:

#### **On Vercel**:
1. Connect your GitHub account with [Vercel](https://vercel.com/).
2. Choose "New Project" and select the `mediflow-bd` repository.
3. Configure **Environment Variables** matching those in `.env`.
4. In setting overrides, ensure build settings match:
   * **Framework Preset**: `Vite` OR `Other`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Click **Deploy**. Vercel will process build assets and provide a live URL.

#### **On Netlify**:
1. Connect your repository on [Netlify](https://www.netlify.com/).
2. Set Build Command to `npm run build` and publish directory to `dist`.
3. Under Environment variables, add all `VITE_FIREBASE_*` variables.
4. Add a `_redirects` file under public folder or a standard configuration to ensure SPA Client router routing operates seamlessly for custom URLs.

---

## 🔮 Future Improvements
* **Advanced Traffic Prediction APIs**: Connecting real-world Dhaka Google Maps or traffic flow sensors to refine SJF/SRTF remaining time estimations.
* **IoT Hardware Integration**: Linking real physical GPS transmitters to ambulance dashboards for true coordinates.
* **Telehealth Video Feeds**: Implementing WebRTC features within the Patient-Ambulance chat channel for instant clinical help.

---

## 🎯 Project Conclusion
**MediFlow BD** demonstrates how complex abstract computer science paradigms (like multi-level CPU scheduling and deadlock avoidance) can solve tangible, physical health logistics resource crises. Through real-time map integration, persistent socketed chat flows, and highly intuitive, clean dashboards, the platform presents a production-grade visualization tool ideal for academic examination.
