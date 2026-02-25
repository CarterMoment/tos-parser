**-- INSTRUCTIONS FOR TESTING --**

***Unit Testing:***

    cd .\ToSAPI\

Only if on Windows:

    python -m venv venv
    .\venv\Scripts\Activate.ps1
Afterwards:

    pip install -r requirements.txt
    pytest -v
   This test file runs unit tests for the backend API with mock LLM calls to avoid unnecessary external API usage
   
***Standard Use Case:***

Navigate to https://app.gertly.com/

- Input a ToS document by copying and pasting (Ctrl+V) into the box or inputting a .txt file.

- (Sample .txt file can be found in the documentation folder)

- Hit the analyze button

- View a list of risky spans, a description of the harmful implications, and a location in the text

Below instructions can be found for web extension usage.

**-- INSTRUCTIONS FOR WEB EXTENSION --**

Once youre cloned into this repo -->

navigate to chrome in a browser -->

extensions -->

manage extensions -->

Turn Developer mode ON -->

select LOAD UNPACKED -->

navigate to where this repo is on your machine and load ToSXTN folder -->

Click the puzzle piece at the top -->

Click ToS Analyzer -->

Enter These Values:

  

API URL

https://xwaznzasl4i26acgf4zjkqw2za0wlshv.lambda-url.us-east-1.on.aws

API Token

4cZp7hQK1YwG5tVr8Lfx9nEj0mT2aSboHdUsqkWNi3vPMyeXRlzBgJF6uDoChA

  

Navigate to any page that has a Policy document linked in the DOM (https://www.ebay.com/ is a good example)

  

A small UI should pop up in the bottom right.

**-- DEVELOPER SETUP --**


cd into ToSAPI

  

download aws cli

  

aws configure & sign into an IAM account

  

get an openai key

  

enter this in your command line

  

export OPENAI_API_KEY='sk-...'

export MODEL_ID='gpt-4o-mini'

export API_KEY='...'

  

How to check logs?

  

$ aws logs tail /aws/lambda/tos-mvp-api --since 15m --follow

  

$ curl -s -X POST "$URL/v1/analyze-file" \

-H "Authorization: Bearer $API_TOKEN" \

-F "file=@tos.txt;type=text/plain"

  
  

go to /ToSParser/ToSWeb/

  

follow the instructions in .env.local.template

  

npm run dev

  

to run locally

  
  

aws lambda update-function-url-config \

--function-name tos-mvp-api \

--cors '{"AllowOrigins":[],"AllowMethods":[],"AllowHeaders":[]}'

gi