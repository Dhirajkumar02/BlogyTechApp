# 📝 BlogyTech App

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-0072C6?style=for-the-badge&logo=gmail&logoColor=white)

---

BlogyTech is a **MERN Stack Blogging Platform** that allows users to **register, verify their accounts via email, create and manage blog posts, categorize them, and interact through comments**.  
The project mainly focuses on **backend development with REST APIs** and provides a strong foundation for frontend integration with React.


---

## 🚀 Features

- 👤 **User Authentication & Authorization**
  - Register/Login with secure **JWT authentication**
  - Email verification using **Nodemailer**
  - Middleware for route protection

- ✍️ **Blog Management**
  - Create, Read, Update, Delete (CRUD) blog posts
  - Add categories to posts
  - Comment system for interaction

- 🔒 **Security**
  - Password hashing
  - JWT-based session handling
  - Verified account check middleware

- 📊 **Scalable Architecture**
  - Separate models for Users, Posts, Categories, Comments
  - Centralized error handling
  - RESTful API structure

---

## 🛠️ Tech Stack

**Frontend (Planned):**
- React.js
- Bootstrap / Tailwind CSS

**Backend:**
- Node.js
- Express.js

**Database:**
- MongoDB (Mongoose ODM)

**Authentication & Utilities:**
- JWT (JSON Web Tokens)
- Bcrypt.js (Password hashing)
- Nodemailer (Email Verification)

**File Handling:**
- Multer (File Upload)

---

## 🔄 Workflow

```
   [Frontend - React] 
            |
            v
   [Backend - Express/Node.js]
            |
    --------------------------
    |           |            |
 [Auth]     [Email]     [Database]
 (JWT)   (Nodemailer)   (MongoDB)

```

 ## 📂 Project Structure
```
BlogyTechApp/
│── backend/
│   ├── server.js                  # Entry point of backend
│   ├── config/
│   │   └── database.js            # MongoDB connection
│   ├── controllers/               # Business logic
│   │   ├── categoriesController.js
│   │   ├── commentsController.js
│   │   ├── postsController.js
│   │   └── usersController.js
│   ├── middlewares/               # Authentication & error handling
│   │   ├── globalErrorHandler.js
│   │   ├── isAccountVerified.js
│   │   └── isLoggedIn.js
│   ├── models/                    # Database Schemas
│   │   ├── Users/User.js
│   │   ├── Posts/Post.js
│   │   ├── Categories/Category.js
│   │   └── Comments/Comment.js
│   ├── routes/                    # API Routes
│   │   ├── usersRouter.js
│   │   ├── postsRouter.js
│   │   ├── categoriesRouter.js
│   │   └── commentsRoute.js
│   ├── utils/                     # Helper functions
│   │   ├── emailService.js
│   │   ├── fileUpload.js
│   │   ├── generateToken.js
│   │   └── sendEmail.js
│   ├── .env                       # Environment variables
│   ├── package.json               # Backend dependencies
│
│── frontend/                      # React frontend (to be implemented)
│   ├── (empty for now)
│
│── README.md                      # Project documentation
│── .git/                          # Git repo data


```
---
## ⚙️ Installation & Setup
### 1️⃣ Clone the repository
```
git clone https://github.com/Dhirajkumar02/blogytech.git
cd blogytech/BlogyTechApp
```
### 2️⃣ Backend Setup
```
cd backend
npm install
```

### Create a .env file in backend/ and add the following:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```
### Run the backend server:
```
npm start
```
### 3️⃣ Frontend Setup (Planned)
```
cd frontend
npm install
npm start
```
---
## 📌 API Endpoints
### User Routes

- POST /api/users/register → Register new user
- POST /api/users/login → Login & get JWT
- GET /api/users/verify/:token → Verify email
- etc..

### Post Routes

- POST /api/posts → Create a blog post
- GET /api/posts → Fetch all blog posts
- GET /api/posts/:id → Fetch single blog post
- PUT /api/posts/:id → Update a blog post
- DELETE /api/posts/:id → Delete a blog post
- etc..

### Category Routes

- POST /api/categories → Add category
- GET /api/categories → Fetch categories
- etc.

### Comment Routes

- POST /api/comments → Add comment
- GET /api/comments/:postId → Fetch comments of a post
- etc.

---

## 🚀 Future Enhancements

- ✅ Complete React Frontend
- ✅ Rich Text Editor for blog posts
- ✅ Admin Dashboard (manage users/posts)
- ✅ Like & Share features
- ✅ Cloud Image Upload (Cloudinary/AWS S3)
  
---
## 📖 Project Explanation (For Interviews)

BlogyTech is a **MERN stack blogging platform** where users can **register, verify their accounts via email, create posts, categorize them, and interact with comments**.
I implemented **JWT authentication, email verification**, and designed MongoDB schemas for **Users, Posts, Categories, and Comments**. The backend is fully functional with **REST APIs**, and the frontend is planned with React.
This project demonstrates my skills in **backend development, API design, authentication, and database modeling**.

---
## 👨‍💻 Author

**Dhiraj Kumar**
- 💼 Java Full Stack Developer | MERN Enthusiast
- 🌐 Portfolio: ![Portfolio](https://dhirajkumar02.github.io/My-Portfolio/)
- 📧 Email: dhirajkumarsaah@gmail,com
- 🔗 LinkedIn: ![LinkedIn](https://www.linkedin.com/in/dhirajkumar02/)

## ⭐ If you like this project, don’t forget to star the repo!



