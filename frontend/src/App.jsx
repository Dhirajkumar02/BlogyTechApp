import { BrowserRouter, Route, Routes } from "react-router-dom";
export default function App() {
  const HomePage = () => {
    return <h1>Welcome to Home Page!</h1>
  };
  const LoginPage = () => {
    return <h1>Welcome to Login Page</h1>
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />}> </Route>
        <Route path="/login" element={<LoginPage />}> </Route>
      </Routes>
    </BrowserRouter>
  )
}