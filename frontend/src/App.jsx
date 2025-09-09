import { BrowserRouter, Route, Routes } from "react-router-dom";
import Homepage from "./components/Homepage/Homepage";
import Login from "./components/Users/Login";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />}> </Route>
        <Route path="/login" element={<Login />}> </Route>
      </Routes>
    </BrowserRouter>
  )
}