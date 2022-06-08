const express = require("express");
const mongoose = require("mongoose");
const port = process.env.PORT || 5000;
const app = express();
const User = require("./model/user");
const cookieParser = require("cookie-parser");

app.set("view engine", "ejs");

// get user input
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// connect to mongodb database
mongoose.connect(
  "mongodb://localhost:27017/userList",
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    console.log("Connected to mongodb database");
  }
);

app.get("/", checkIsLoggedIn, (req, res) => {
  res.render("index", {
    user: req.user,
  });
});

app.get("/logout", checkIsLoggedIn, (req, res) => {
  // remove cookie
  res.cookie("user", "", { expires: new Date(0) });

  res.redirect("/");
});

app.get("/signup", (req, res) => {
  if (req.cookies.user) {
    res.redirect("/");
    return;
  }

  res.render("signup", {
    error: null,
    user: null,
  });
});
app.post("/signup", createAccount, (req, res) => {
  res.redirect("/signin");
});

app.get("/signin", (req, res) => {
  if (req.cookies.user) {
    res.redirect("/");
    return;
  }

  res.render("signin", {
    error: null,
    user: null,
  });
});
app.post("/signin", login, (req, res) => {
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// middleware functions
async function checkIsLoggedIn(req, res, next) {
  if (req.cookies.user) {
    // find user without pass
    const user = await User.findOne({ _id: req.cookies.user });
    if (user) {
      req.user = user;

      next();
    } else {
      res.redirect("/signin", {
        error: "You are not logged in!",
        user: null,
      });
    }
  } else {
    res.render("signin", {
      error: "You must be logged in to view this page",
      user: null,
    });
  }
}

async function createAccount(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.render("signup", {
      error: "Please fill all the fields",
      user: null,
    });
    return;
  }

  if (password.length < 6) {
    res.render("signup", {
      error: "Password must be at least 6 characters long",
      user: null,
    });
    return;
  }

  try {
    //   find user by email
    const findUser = await User.findOne({ email });

    if (findUser) {
      res.render("signup", {
        error: "Email already exists",
        user: null,
      });

      return;
    } else {
      const newUser = new User({
        name,
        email,
        password,
      });
      await newUser.save();

      next();
    }
  } catch (error) {
    res.render("signup", {
      error: "Something went wrong, try again!",
    });
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    res.render("signin", {
      error: "Please fill all the fields",
    });
    return;
  }

  try {
    const findUser = await User.findOne({ email });
    if (!findUser) {
      res.render("signin", {
        error: "Email does not exist",
      });
      return;
    } else {
      const isPasswordCorrect = password === findUser.password;
      if (!isPasswordCorrect) {
        res.render("signin", {
          error: "Password is incorrect",
          user: null,
        });
        return;
      } else {
        req.user = findUser;
        res.cookie("user", req.user.id, { maxAge: 1000 * 60 * 5 });
        next();
      }
    }
  } catch (error) {
    res.render("signin", {
      error: "Something went wrong, try again!",
    });
  }
}
