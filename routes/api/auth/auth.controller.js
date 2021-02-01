const jwt = require('jsonwebtoken')
const User = require('../../../models/user')

/*
    POST /api/auth
    {
        username,
        password
    }
*/

exports.register = (req, res) => {
    const { username, password } = req.body
    let newUser = null

    // create a new user if does not exist
    const create = (user) => {
        if(user) {
            throw new Error('username exists')
        } else {
            return User.create(username, password)
        }
    }

    // count the number of the user
    const count = (user) => {
        newUser = user
        return User.count({}).exec()
    }

    // assign admin if count is 1
    const assign = (count) => {
        if(count === 1) {
            return newUser.assignAdmin()
        } else {
            // if not, return a promise that returns false
            return Promise.resolve(false)
        }
    }

    // respond to the client
    const respond = (isAdmin) => {
        res.json({
            message: 'registered successfully',
            admin: isAdmin ? true : false
        })
    }

    // run when there is an error (username exists)
    const onError = (error) => {
        res.status(409).json({
            message: error.message
        })
    }

    // check username duplication
    User.findOneByUsername(username)
    .then(create)
    .then(count)
    .then(assign)
    .then(respond)
    .catch(onError)
}

/*
    POST /api/auth/login
    {
        username,
        password
    }
*/

exports.login = (req, res) => {
    const {username, password} = req.body;
    const access_token_secret = req.app.get('jwt-access_token_secret');
    console.log('access_token_secret ' + access_token_secret);
    // check the user info & generate the jwt
    const check = (user) => {
        if(!user) {
            // user does not exist
            throw new Error('login failed')
        } else {

            // user exists, check the password
            if(user.verify(password)) {
                // create a promise that generates jwt asynchronously
                const p = new Promise((resolve, reject) => {
                    jwt.sign(
                        {
                            _id: user._id,
                            username: user.username,
                            admin: user.admin
                        }, 
                        access_token_secret,
                        {
                            expiresIn: '30s',
                            issuer: 'joejung',
                            subject: 'userInfo'
                        }
                    ,(err, token) => {
                        if (err) reject(err)
                        let userWithToken = {
                            user: user,
                            accessToken: token
                        }
                        resolve(userWithToken) 
                    });
                });
                return p
            } else {
                throw new Error('login failed')
            }
        }
    }

    // get the refresh token
    const getRefreshToken = (userWithToken) => {
        console.log('user: ' + userWithToken.user);
        console.log('accessToken: ' + userWithToken.accessToken);
        const refresh_token_secret = req.app.get('jwt-refresh_token_secret');
        let refreshToken = jwt.sign(userWithToken.user._id.toJSON(),refresh_token_secret);
        User.updateOne({_id: userWithToken.user._id}, {$set: {refreshToken: refreshToken}}, {new:true}, function(err,doc) {
            if (err) { throw err; }
            else { console.log("Updated"); }
        });  
        return new Promise((resolve,reject)=> {
            resolve({accessToken: userWithToken.accessToken, refreshToken: refreshToken});
        });
    }

    // respond the token 
    const respond = (token) => {
        res.json({
            message: 'logged in successfully',
            token
        });
    }

    // error occured
    const onError = (error) => {
        res.status(403).json({
            message: error.message
        })
    }

    // find the user
    User.findOneByUsername(username)
    .then(check)
    .then(getRefreshToken)
    .then(respond)
    .catch(onError)

}

/*
    GET /api/auth/check
*/
exports.check = (req, res) => {
    res.json({
        success: true,
        info: req.decoded
    })
}

/*
    POST /api/auth/token
*/
exports.token = (req,res) => {
    const getNewAccessToken = new Promise((resolve, reject) => {
        const refreshToken = req.body.refreshToken;
        const refresh_token_secret = req.app.get('jwt-refresh_token_secret');
        const access_token_secret = req.app.get('jwt-access_token_secret');
        if(refreshToken == null) return res.sendStatus(401);
        jwt.verify(refreshToken,refresh_token_secret,(err,user)=> {
            console.log('user ' + user);
            if (err) return res.sendStatus(403)
            const accessToken = jwt.sign(
                {user}, 
                access_token_secret,
                {
                    expiresIn: '30s',
                    issuer: 'joejung',
                    subject: 'userInfo'
                });
            resolve(accessToken);
        });
    });

    // respond the token 
    const respond = (token) => {
        res.json({
            success: true,
            token
        });
    }

    // error occured
    const onError = (error) => {
        res.status(403).json({
            message: error.message
        })
    }

    getNewAccessToken
    .then(respond)
    .catch(onError)
}