import React from 'react'
import Singup from './Components/Singup'
import Countdown from './Components/Interval'
import Timer from './Components/Interval'
import UseEffect from './Components/Card'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './Router/Navbar'
import Home from './Router/Home'
import About from './Router/About'
import Services from './Router/Services'
import Portfolio from './Router/Portfolio'
import Teacher from './Router/Teacher'
import Students from './Router/Students'

const App = () => {
  return (
    <>
    

    {/* <Singup /> */}

    
    {/* <Timer /> */}
    {/* <UseEffect /> */}
 
 <BrowserRouter>
 <Navbar />

 
 <Routes>
<Route path='/' element={<Home/>} />
<Route path='/About'  element={<About/>} >
<Route path='Teacher' element={<Teacher/>} />
<Route path='Students' element={<Students/>} />
</Route>

<Route path='/Services'  element={<Services/>} />
<Route path='/Portfolio'  element={<Portfolio/>} />

 </Routes>
 
 

 </BrowserRouter>
 
 
 
 
 
 
    </>
  )
}

export default App
