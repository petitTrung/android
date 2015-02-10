package me.gurinderhans.sfumaps;

import android.graphics.PointF;

import com.google.android.gms.maps.model.LatLng;

/**
 * Created by ghans on 2/9/15.
 */
public class MapTools {

    static PointF pixelOrigin_ = new PointF(AppConstants.TILE_SIZE / 2, AppConstants.TILE_SIZE / 2);
    static double pixelsPerLonDegree_ = AppConstants.TILE_SIZE / 360;
    static double pixelsPerLonRadian_ = AppConstants.TILE_SIZE / (2 * Math.PI);

    public static PointF fromLatLngToPoint(LatLng latLng) {
        PointF point = new PointF(0, 0);
        PointF origin = pixelOrigin_;

        point.x = (float) (origin.x + latLng.longitude * pixelsPerLonDegree_);

        // Truncating to 0.9999 effectively limits latitude to 89.189. This is
        // about a third of a tile past the edge of the world tile.
        double siny = bound(Math.sin(degreesToRadians(latLng.latitude)), -0.9999, 0.9999);

        point.y = (float) (origin.y + 0.5 * Math.log((1 + siny) / (1 - siny)) * -pixelsPerLonRadian_);
        return point;
    }

    public static LatLng fromPointToLatLng(PointF point) {
        PointF origin = pixelOrigin_;
        double lng = (point.x - origin.x) / pixelsPerLonDegree_;
        double latRadians = (point.y - origin.y) / -pixelsPerLonRadian_;
        double lat = radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);
        return new LatLng(lat, lng);
    }

    public static double bound(double value, double opt_min, double opt_max) {
        if (opt_min != 0) return Math.max(value, opt_min);
        if (opt_max != 0) return Math.min(value, opt_max);
        return -1;
    }

    private static double degreesToRadians(double deg) {
        return deg * (Math.PI / 180);
    }

    private static double radiansToDegrees(double rad) {
        return rad / (Math.PI / 180);
    }
}