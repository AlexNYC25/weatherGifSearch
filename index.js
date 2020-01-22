// Created by Alexis Montes CS355


// libraries
const http = require('http');
const url = require('url');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs')

// api endpoints
const openWeatherEndpoint = 'https://api.openweathermap.org/data/2.5/weather?';
const giphyEndpoint = 'https://api.giphy.com/v1/gifs/search?';

// credentials json file
const credentials = require('./auth/credentials.json')

// function takes basic weather description and returns a sentence version of it.
const descriptionConversion = function(originalDescription){
    if(originalDescription == "Thunderstorm"){
        return "There is a thunderstorm"
    }
    if(originalDescription == "Drizzle"){
        return "It is drizzling"
    }
    if(originalDescription == "Rain"){
        return "It is raining"
    }
    if(originalDescription == "Snow"){
        return "It is snowing"
    }
    if(originalDescription == "Clear"){
        return "It is clear"
    }
    if(originalDescription == "Clouds"){
        return "It is cloudy"
    }
    else{
        return "outside there is ".concat(originalDescription);
    }

}


const server = http.createServer((req, res) => {
    // Path for root webpag4
    if(req.url === "/"){
        let home = fs.createReadStream("./html/form.html");
        res.writeHead(200, {'Content-Type':'text/html'});
        home.pipe(res);
    }
    if(req.url.startsWith("/favicon.ico")){
        res.writeHead(404);
        res.end();
    }
    // Path for gif files downloaded locally
    if(req.url.startsWith("/gif/")){
        let dirStart = '.'
        let gif = fs.createReadStream(dirStart.concat(req.url.valueOf()));
        gif.on('error', () => {
            res.writeHead(404);
            res.end();
        })
        res.writeHead(200, {'Content-Type':'image/jpeg'});
        gif.pipe(res)
    }
    // path for /serach path
    if(req.url.startsWith("/search")){
        // varaibles from index form to process and formated search query
        let zipcode = url.parse(req.url.valueOf(), parseQueryString=true).query.zip;
        let openWeatherQuery = querystring.stringify({zip:zipcode, appid:credentials["openWeather"].apikey })
        let openWeatherFullRequest = openWeatherEndpoint.concat(openWeatherQuery)

        // 
        const openWeatherApiResult = https.request(openWeatherFullRequest, (res) => {
            let body = ""
            res.on('data', (chunk) => {
                body += chunk;
            })

            // once the full json object has been downloaded
            res.on('end', function() {
                let weatherJSON = JSON.parse(body);
                // if openweather returns a json object that has anything other than a 200 code then the request was invalid
                // and generates a webpage telling them so.
                if(weatherJSON.cod != 200){
                    generateErrorPage()
                }
                else{
                    // startes converting raw json values for human readable text
                    let desc = weatherJSON.weather[0].main;
                    let formattedDesc = descriptionConversion(desc)
                    let temp = (weatherJSON.main.temp);
                    temp = Math.round((temp * (9/5)) - 459.67)
                    

                    let formatedTempMax = Math.round((weatherJSON.main.temp_max * (9/5)) - 459.67)
                    let formatedTempMin = Math.round((weatherJSON.main.temp_min * (9/5)) - 459.67)

                    let paragraphDesc = `Other Weather Details for ${weatherJSON.name}: <br>
                                         <ul>
                                            <li>The Wind Speed is currently ${weatherJSON.wind.speed} miles per hour </li>
                                            <li>The max temperature for today is ${formatedTempMax} &#8457 </li>
                                            <li>The min temperature for today is ${formatedTempMin} &#8457 </li>
                                            `
                    if(weatherJSON.clouds.all > 80){
                        paragraphDesc += `<li> It is currently very cloudy</li>`
                    }
                    else if(weatherJSON.clouds.all > 50){
                        paragraphDesc += `<li> It is partly cloudy </li>`
                    }
                    else if(weatherJSON.clouds.all > 30){
                        paragraphDesc += `<li> It is a little cloudy </li>`
                    }
                    else{
                        paragraphDesc += `<li> It is clear outside </li>`
                    }

                    if(weatherJSON.weather[0].main == "Rain"){
                        formatedRain = Math.round(weatherJSON.rain['1h'] * 0.039370)
                        paragraphDesc += `<li> There has been ${formatedRain} inches of rain in the past hour`
                    }

                    if(weatherJSON.weather[0].main == "Snow"){
                        formatedSnow = Math.round(weatherJSON.snow['1h'] * 0.039370)
                        paragraphDesc += `<li> There has been ${weatherJSON.snow['1h']} mm of snow in the past hour`
                    }

                    paragraphDesc += `</ul>`
    
                    // variables for giphy request and the formated url for the request
                    let offset = Math.floor(Math.random() * 25)
                    let giphyQuery = querystring.stringify({api_key:credentials["giphy"].apikey ,q:desc, offset:offset})
                    let giphyFullRequest = giphyEndpoint.concat(giphyQuery)
                    
    
                    // request for json of gifs 
                    const gifRequest = https.request(giphyFullRequest, (res) => {
                        let gifBody = "";
                        res.on('data', (chunk) => {
                            gifBody += chunk;
                        })
                        res.on('end', function() {
                            // creates relevant variables for webpage
                            let gifJSON = JSON.parse(gifBody);
                            let itemNum = Math.floor(Math.random() * 20)
                            let gifId = gifJSON.data[itemNum].id
                            let giphyURL = gifJSON.data[itemNum].url;
                            let gifURL = gifJSON.data[itemNum].images.downsized.url;
                            let gifTitle = gifJSON.data[itemNum].title;
                            let localGifURL = './gif/'.concat(gifId, '.gif')


                            // checks if local gif file has been previously downloaded
                            fs.access(localGifURL, fs.F_OK, (err) => {
                                if (err) {
                                    //console.log(err)
                                    gifReq = https.get(gifURL, function(res){
                                        let gifItem = fs.createWriteStream(localGifURL, {'endcoding':null});
                                        res.pipe(gifItem)
            
                                        gifItem.on('finish', function(){
                                            generateWebpage(localGifURL, formattedDesc, temp, giphyURL, paragraphDesc, gifTitle);
                                        })
            
                                        
                                    })
            
                                    gifReq.on('error', function(err){
                                        console.log(err);
                                    })
            
                                    gifReq.end();
                                }
                                else{
                                    generateWebpage(localGifURL, formattedDesc, temp, gifURL, paragraphDesc, gifTitle)
                                }
                            })
    

                        })
                    })
    
                    gifRequest.on('error', (e) => {
                        console.log(e);
                    })
    
                    gifRequest.end();
                }
                
            })
        });

        openWeatherApiResult.on('error', (e) => {
            console.log(e);
        })

        openWeatherApiResult.end();

        // function to return web error page for invalid zip code
        const generateErrorPage = function(){
            let errMSG = `<h1>This zipcode is not valid </h1><br>`
            let localLink = 'http://localhost:3000/'
            let linkBack = `<a href='${localLink}'> Click to Go back </a>`

            res.end(errMSG.concat(linkBack))
        }

        // function to generate weather page with varibles passed through it
        const generateWebpage = function( gifurl, weatherType, weatherVal, originalUrl, p, gifTitle){
            let header = `<h1> Weather Results for ${zipcode} <br></h1>`;
            let body = `<h3>weather is currently: ${weatherVal} &#8457 <br> And ${weatherType} <br></h3>`
            
            let gifBody = `<img src='${gifurl}'> </img> <br>`
            let giphyURLLink = `<a href='${originalUrl}' alt='${gifTitle}'> link to original giphy page </a>`

            res.end(header.concat(body,p, gifBody, giphyURLLink))
        }

        //let currentWeather = https.request()
        //res.end("Search Started")
    }
});

server.listen(3000);