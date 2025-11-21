import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./containers/Dashboard";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;
