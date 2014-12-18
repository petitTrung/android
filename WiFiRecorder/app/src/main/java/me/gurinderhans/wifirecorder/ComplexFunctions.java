package me.gurinderhans.wifirecorder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;

/**
 * Created by ghans on 14-12-17.
 */
public class ComplexFunctions {

    public static final String TAG = ComplexFunctions.class.getSimpleName();

    public static ArrayList<ArrayList<HashMap<String, String>>> filterAPs(ArrayList<HashMap<String, String>> indata, ArrayList<String> selectedWifis) {

        ArrayList<ArrayList<HashMap<String, String>>> allWifisData = new ArrayList<>();

        for (String wifi : selectedWifis) {

            ArrayList<HashMap<String, String>> currentSSIDData = new ArrayList<>();
            ArrayList<HashMap<String, String>> filteredData = new ArrayList<>();

            //get current ssid rows
            for (HashMap<String, String> hashMap : indata) { // ?remove this wifi from data to make data smaller?

                if (hashMap.get(WiFiDatabaseManager.KEY_SSID).equals(wifi)) {
                    currentSSIDData.add(hashMap);
                }
            }

            for (HashMap<String, String> hashMap : getStrongestBSSIDs(currentSSIDData)) {

                if (Integer.parseInt(hashMap.get(WiFiDatabaseManager.KEY_RSSI)) > (-65)) {
                    filteredData.add(hashMap);
                }
            }

            allWifisData.add(filteredData);
        }

        return allWifisData;
    }

    public static ArrayList<HashMap<String, String>> getStrongestBSSIDs(ArrayList<HashMap<String, String>> d) {

        Collections.sort(d, new SortByRSSI(WiFiDatabaseManager.KEY_RSSI));

        for (int i = 0; i < d.size(); i++) {
            HashMap<String, String> compareTo = d.get(i);
            for (int j = i + 1; j < d.size(); j++) {
                HashMap<String, String> comparing = d.get(j);

                String compareToStr = compareTo.get(WiFiDatabaseManager.KEY_BSSID);
                String comparingStr = comparing.get(WiFiDatabaseManager.KEY_BSSID);

                boolean compareResult = compareToStr.equals(comparingStr);

                if (compareResult) {
                    d.remove(j);
                    j -= 1;
                }

            }
        }

        return d;
    }
}

class SortByRSSI implements Comparator<HashMap<String, String>> {
    private final String key;

    public SortByRSSI(String key) {
        this.key = key;
    }

    public int compare(HashMap<String, String> first, HashMap<String, String> second) {
        int firstValue = Integer.parseInt(first.get(key));
        int secondValue = Integer.parseInt(second.get(key));
        return (secondValue < firstValue ? -1 : (secondValue == firstValue ? 0 : 1));
    }
}

class SortByTime implements Comparator<HashMap<String, String>> {
    private final String key;

    public SortByTime(String key) {
        this.key = key;
    }

    public int compare(HashMap<String, String> first, HashMap<String, String> second) {
        long firstValue = Long.parseLong(first.get(key));
        long secondValue = Long.parseLong(second.get(key));
        return (firstValue < secondValue ? -1 : (firstValue == secondValue ? 0 : 1));
    }
}
