import React, { useState } from "react";
import { View } from "react-native";

export default function Position(props) {
  // onMoveは画面にタッチして指を動かした時に発火するイベント App.jsに渡す
  // onEndは画面から指を話した時に発火するイベント App.jsに渡す
  const { onMove, onEnd } = props;

  const largeRadius = 90; // 大きい円の半径
  const smallRadius = largeRadius / 3; // 小さい円の半径
  //円形バーチャルスティックの中心座標を設定
  const [x, setX] = useState(largeRadius - smallRadius); // 大きい円の半径 - 小さい円の半径の差 x
  const [y, setY] = useState(largeRadius - smallRadius); // 大きい円の半径 - 小さい円の半径の差 y

  const handleTouchMove = (e) => {
    const touchX = e.nativeEvent.locationX; // 画面をタッチしたときのx座標
    const touchY = e.nativeEvent.locationY; // 画面をタッチしたときのy座標
    // タッチした座標から小さい円の半径を差し引いた円の中心の座標を設定
    let coordinates = {
      x: touchX - smallRadius,
      y: touchY - smallRadius,
    };
    // Math.atan2でラジアンを算出する
    const radian = Math.atan2(y, x);
    // 大きい円と小さい円の中心が接している座標を算出
    // ラジアンからコサインを算出し、大きい円の半径と乗算し座標を算出する
    let limitX = largeRadius - smallRadius + largeRadius * Math.cos(radian);
    let limitY = largeRadius - smallRadius + largeRadius * Math.sin(radian);
    // タッチした座標と大きい円の座標の小さい値をx座標、y座標にセットする
    setX(Math.min(coordinates.x, limitX));
    setY(Math.min(coordinates.y, limitY));
    onMove({ x: x, y: y });
  };
  // 指を話した時に実行される関数、座標を中心（初期座標）に戻しonEndイベントを渡す
  const handleTouchEnd = () => {
    setX(largeRadius - smallRadius);
    setY(largeRadius - smallRadius);
    onEnd();
  };

  return (
    <>
      <View>
        <View
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: 2 * largeRadius, // 半径 * 2
            height: 2 * largeRadius,
            borderRadius: largeRadius, // 円形にする
            backgroundColor: "black",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              height: 2 * smallRadius, // 半径 * 2
              width: 2 * smallRadius,
              borderRadius: smallRadius, // 円形にする
              backgroundColor: "blue",
              position: "absolute",
              transform: [{ translateX: x }, { translateY: y }],
            }}
          />
        </View>
      </View>
    </>
  );
}
