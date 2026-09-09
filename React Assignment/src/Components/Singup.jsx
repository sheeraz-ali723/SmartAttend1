import React, { useState } from 'react'
import './Singup.css'

const Signup = () => {
    const [formData,setFormData] = useState({fname:'', lname:'',email:'',address:'',password:''});

    const handleChange = (e)=>{
        setFormData((prev)=>({
            ...prev,
            [e.target.name]:e.target.value
        }))
    }

    const handleSubmit = (e)=>{
        e.preventDefault();
        console.log(formData);
    }

  return (
    <div>
        <form onSubmit={handleSubmit}>
            <label>FirstName</label>
            <input type='text' name='fname' onChange={handleChange} placeholder='Enter your First name' /><br /><br />
             <label>LastName</label>
            <input type='text' name='lname' onChange={handleChange} placeholder='Enter your Last name' /><br /><br />
            <label>Address</label>
            <input type='text' name='address' onChange={handleChange} placeholder='Enter Your Address' /><br /><br />
            <label>Email</label>
            <input type='email' name='email' onChange={handleChange} placeholder='Enter your email' /><br /><br />
            <label>Password</label>
            <input type='password' name='password' onChange={handleChange} placeholder='Enter your password' /><br /><br />
            <button type='submit'>Submit</button>
        </form>
    </div>
  )
}

export default Signup