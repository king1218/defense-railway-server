const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rahsr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req,res,next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({massage: 'UnAthorized Access!!'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,function(err,decoded){
    if(err){
      return res.status(403).send({massage:'Forbidden Access'});
    }
    req.decoded= decoded;
    next();
  })
}


async function run(){
    try{
        await client.connect();
        const JobCollection= client.db('Quick-Solution').collection('Jobs');
        const AppliedJobCollection=client.db('Quick-Solution').collection('Applied-Jobs')
  
        const UsersCollection=client.db('Quick-Solution').collection('Users')
        const CategoryCollection=client.db('Quick-Solution').collection('Category')
        const ReviewCollection=client.db('Quick-Solution').collection('Reviews')
  //  find Job APi:
        app.get('/findjob', async(req, res) =>{
            const keyword = req.query.keyword;
            const query = {
              "$or":[
                {"AuthorName":{$regex:keyword}},
                {"Category":{$regex:keyword}},
                {"location":{$regex:keyword}}
              ]
            }
            const Jobs = await JobCollection.find(query).toArray();
            res.send(Jobs);
        })
      
        // Get All Jobs In Database Api:
        app.get('/jobs',verifyJWT, async(req, res) =>{
            const query = {};
            const cursor = JobCollection.find(query);
            const Jobs = await cursor.toArray();
            res.send(Jobs);
        })
        //Delete Job By JobId:
        app.delete('/deletejob/:jobid',verifyJWT, async(req,res)=>{
          const id=req.params.jobid;
          const filter = {_id:ObjectId(id)};
          const result = await JobCollection.deleteOne(filter);
          res.send(result);

        })

        // GET All Jobs:
        app.get('/jobs/:jobid', async (req,res)=>{
          const id=req.params.jobid;
          
          const query = {_id:ObjectId(id)};
          const job = await JobCollection.findOne(query);
          res.send(job);
        })
       
        // Job Posting API:
          app.post('/jobs',verifyJWT, async (req, res) => {
          const Job = req.body;
          const result = await JobCollection.insertOne(Job);
          res.send(result);
      });
      //JwT Token by user API:
      app.put('/user/:email', async(req,res)=>{
        const email = req.params.email;
        const user = req.body;
        const filter = {email:email};
        const options = {upsert:true};
        const updateDoc ={
          $set:user,
        };
        const result = await UsersCollection.updateOne(filter,updateDoc,options);
        const token = jwt.sign({email: email},process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res.send({result, accessToken: token});
      })
           // admin or not:
           app.get('/user/admin/:email',verifyJWT,async(req,res)=>{
            const email = req.params.email;
            const user=await UsersCollection.findOne({ email: email});
            const isAdmin = user.role ==='admin'
            res.send({admin:isAdmin});
          })
            // admin role:
             app.put('/user/admin/:email',verifyJWT,async(req,res)=>{
              const email = req.params.email;
              const requester=req.decoded.email;
              const requesterAccount=await UsersCollection.findOne({ email:requester });
              if(requesterAccount.role ==='admin' ){
                const filter = {email:email};
                const updateDoc ={
                  $set:{role:'admin'},
                };
                const result = await UsersCollection.updateOne(filter,updateDoc);
              
                res.send(result);
    
              }
              else{
                res.status(403).send({massage:'Forbidden Access'})
              }
             
            })

      // User Information getting/Profile API:
          app.get('/user/:email',verifyJWT, async (req, res) => {
            const email= req.params.email;
            const result = await UsersCollection.findOne({email:email});
 
          res.send(result);
      });

      // All Users API:
          app.get('/users',verifyJWT, async (req, res) => {
          const q={};
            const result = await UsersCollection.find(q).toArray();
 
          res.send(result);
      });
  // Delete USer:
  
   app.delete('/user/:email',verifyJWT, async (req, res) => {
   const email = req.params.email;
   const requester=req.decoded.email;
   const requesterAccount=await UsersCollection.findOne({ email:requester });
   if(requesterAccount.role ==='admin' ){
    const filter = {email: email};
   const result = await UsersCollection.deleteOne(filter);
   res.send(result);
   }
   else{
    res.status(403).send({massage:'Forbidden Access'})
  }
   
   })


      // Apply job by user Api:

      app.put('/findjob/:jobid', async (req,res)=>{
        const Jobid=req.params.jobid;
        const email = req.query.email;
        const AppliedJob=req.body;
       
        
       
        const AppliedJobs = {
          "Jobid":Jobid,
          "email":email,
          "Information":AppliedJob
         
        }
        const filter = {email:email,
          Jobid:Jobid
        };
          const options = {upsert:true};
          const updateDoc ={
            $set:AppliedJobs,
          };
          const result = await AppliedJobCollection.updateOne(filter,updateDoc,options);
         res.send(result);
    })
// Remove Apply:
    app.delete('/myApplied/:Jobid',verifyJWT, async (req, res) => {
      const Jobid = req.params.Jobid;
      const filter = {Jobid: Jobid};
      const result = await AppliedJobCollection.deleteOne(filter);
      res.send(result);
    })

// Find Applied Jobs By user:

    app.get('/myApplied/:email',verifyJWT,async(req, res) =>{
      const email=req.params.email;
      const query = {email:email};
      const  AppliedJobs = await AppliedJobCollection.find(query).toArray();
      res.send(AppliedJobs)
    })


//GET Posted Jobs:
app.get('/myjobs/:email',verifyJWT, async (req,res)=>{
const email =req.params.email;
const Jobs = await JobCollection.find({email:email}).toArray();

res.send(Jobs)
})

// ADD Category API :
app.put('/category/add', async(req,res)=>{
  const Category= req.body;

  const filter = {name:Category.name};
    const options = {upsert:true};
    const updateDoc ={
      $set:Category,
    };
    const result = await CategoryCollection.updateOne(filter,updateDoc,options);
   res.send(result);
})
// GET Category API :
app.get('/categories', async(req,res)=>{
    const q={};
    const Categories = await CategoryCollection.find(q).toArray();
   
   res.send(Categories);
})



// GET Candidates API:
app.get('/candidate/:Jobid',async (req,res)=>{
  const Jobid=req.params.Jobid;
 const q={Jobid:Jobid}
const Candidates = await AppliedJobCollection.find(q).toArray();
res.send(Candidates)
})


// Post Review:
  
app.post('/reviews',verifyJWT, async (req, res) => {
      const Review = req.body;
      const result = await ReviewCollection.insertOne(Review);
      res.send(result);
  });
// Get Review:
  
app.get('/reviews', async (req, res) => {
  const q={};
  const result = await ReviewCollection.find(q).toArray();
  res.send(result);
  });
// Get Review:
app.delete('/reviews/:id',verifyJWT, async (req, res) => {
  const id = req.params.id;
  const filter = {_id: (ObjectId(id))};
  const result = await ReviewCollection.deleteOne(filter);
  res.send(result);
})








    

    }
    finally{

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello From Quick Solution!')
})

app.listen(port, () => {
  console.log(`Quick Solution App listening on port ${port}`)
})