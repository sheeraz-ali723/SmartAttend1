import axios from 'axios'
import React, { useEffect, useState } from 'react'

const UseEffect = () => {

const[render,setRender]=useState(0);
const[users,setusers]=useState([]);

const fetchData=async()=>{
const data=await
axios.get("https://jsonplaceholder.typicode.com/users")
setusers(data.data)

}
 useEffect(()=>{
    fetchData();
 },[])

console.log(users)


  return (
    <div className="min-h-screen bg-gray-100 p-6  ">
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {
        users.map((user)=>(
          <div key={user.id} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-2xl transition duration-300 font-medium text-gray-700 text-center">
          
            <h1>Title: {user.name}</h1>
            <h2>Name: {user.name}</h2>
            <h3>Id: {user.id}</h3>
            <h4>User Name: {user.username}</h4>
            <h5>City: {user.address?.city}</h5>
            <h6>Street: {user.address?.street}</h6>
            <h6>Email: {user.email}</h6>
            <h6>Lat: {user.address?.geo?.lat}</h6>
            <h6>Suite: {user.address?.suite}</h6>
            </div>
            
        ))
    }
</div>
    </div>
</div>



  )
}



export default UseEffect
