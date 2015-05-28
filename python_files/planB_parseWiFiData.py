"""
Import required modules
-----------------------
"""

import sqlite3, difflib
import SimpleHTTPServer, SocketServer, os, sys, json
from datetime import datetime
from pprint import pprint


# CONSTS ----------------
SSIDS = ["SFUNET", "SFUNET-SECURE", "eduroam"]
# init this class for the specified database
DB_CURSOR = sqlite3.connect("wifi_data.db").cursor()


"""
function def(s)
---------------
"""

# small printer
p = lambda obj: pprint(obj)
# converts unix timestamp to a readable date time
dt = lambda x: datetime.fromtimestamp(x)
# returns the similarity ratio for two lists
diff = lambda x, y: difflib.SequenceMatcher(None, x, y).ratio()

# returns the list of all tables in the database
def get_data_tables():
    DB_CURSOR.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return [str(i[0]) for i in DB_CURSOR.fetchall()[1:]] # ignore `android_metadata` table


# get data for the specified table and return
# a dict defining that table object
def createTable(tableName):
    # fetch data from table and its reverse
    DB_CURSOR.execute("select * from " + tableName)
    # sanitize the list and also remove alien SSIDS
    data = [ [  str(i[1])
              , str(i[2])
              , int(i[3])
              , int(i[4])
              , int(i[5])  ] for i in DB_CURSOR.fetchall() if i[1] in SSIDS]

    # set start & finish time vars
    startT = data[0][-1]
    endT = data[-1][-1]

    # is the data reversed ?
    revrsd = ("_R" in tableName) and True or False

    return {
        "data":data,
        "startT":startT,
        "endT":endT,
        "reversed": revrsd
    }

# parse data
def parseData(dict_data={}):

    data = dict_data['data']

    ### 1. Split DATA by SSID ---------------------------------------------

    # fill dict with keys
    tmpDict={i:[] for i in SSIDS}
    # fill dict keys with data
    for i in data:
        tmpDict[i[0]].append(i)
    data = tmpDict

    ### 2. Group DATA by BSSID for each SSID -----------------------------

    # create dict to store bssid group dicts
    tmp_data={}
    # split data by bssid
    for i in SSIDS:
        # grab the data chunk for this ssid
        Tdata = data[i]
        # create a tmp dictionary for storing split values for each ssid
        tmpDict={}
        # append values to dict where each key is a unique BSSID
        for j in Tdata:
            if j[3] > -80:
                try:
                    tmpDict[j[1]].append(j)
                except:
                    tmpDict[j[1]] = [j]

        # remove dict key if it has less than 15 items in it's array
        for k, v in tmpDict.items():
            if len([m[3] for m in v]) < 15:
                del tmpDict[k]

        tmp_data[i] = tmpDict

    dict_data['data'] = tmp_data

    return dict_data

def getData():
    fwd = createTable("apsdata_SFU_BURNABY_AQ_3000_East_Street_1")
    bck = createTable("apsdata_SFU_BURNABY_AQ_3000_East_Street_R_1")

    return [parseData(fwd), parseData(bck)]


"""
Server Functionality
--------------------
"""

from urlparse import urlparse, parse_qs

server_addr, server_port = ('localhost', 8080)

class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):


    def do_GET(self):
        # show the dir list
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        try:
            # content_length = int(self.headers['Content-Length'])
            # content = self.rfile.read(content_length)
            # post_data = parse_qs(urlparse(content).path)
            # print post_data

            data=getData()


            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps( data ))
        except:
            print "Unexpected error:"+ str(sys.exc_info())
        return

httpd = SocketServer.TCPServer((server_addr, server_port), ServerHandler)

print "Serving on port:", server_port
try: httpd.serve_forever()
except: pass

httpd.server_close()




"""
NeXt Step:
--------------------------

Basically the plan for plotting the data accurately on the map is:
- take all diff RSSI levels of each BSSID (very large rssi values get filtered out)
- now we have each APs heatmap
- we know from our heatmap at what time the ap entered and left our line space
- the `totalMillis` is our whole line space
- we draw our heatmap inside this space, hopefully giving us good coverage of the area

- Try drawing the data on the map to get a better view of the data
  |--> If possible fade the rssi data rows by rssi (good rssi = darker elsewise lighter dots on map)

"""