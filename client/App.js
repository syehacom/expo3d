import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import { GLView } from "expo-gl";
import { Renderer } from "expo-three";
import { TweenMax } from "gsap";
import {
  PointLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  AnimationMixer, // アニメーションのため追加
  Clock, // アニメーションのため追加
} from "three";
import Positon from "./Position"; // バーチャルスティック
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Asset } from "expo-asset"; // ファイル読み込みのため追加
import io from "socket.io-client";

export default function App() {
  const [cameras, setCameras] = useState(null);
  const [modelsA, setModelsA] = useState(null); // 3Dモデルをセットする変数
  const [walkA, setWalkA] = useState(true); // アニメーションをセットする変数
  const [modelsB, setModelsB] = useState(null);
  const [walkB, setWalkB] = useState(true);
  const [modelsC, setModelsC] = useState(null);
  const [walkC, setWalkC] = useState(true);
  const [action, setAction] = useState({ z: 0, x: 0 });
  const [daruma, setDaruma] = useState(false);
  const [stare, setStare] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    // サーバーのアドレス
    const socket = io("＜サーバーのアドレス＞");
    // サーバーからランダムな値を受け取り変数darumaにセット
    socket.on("enemy", (data) => {
      setDaruma(false);
      setDaruma(data);
    });
    return () => socket.disconnect();
  }, [modelsC]);

  useEffect(() => {
    // サーバーのアドレス
    const socket = io("＜サーバーのアドレス＞");
    // 接続されたときにFromAPIから座標と回転、歩いているか否かの値を受け取る
    socket.on("connect", () => {
      socket.on("FromAPI", (data) => {
        // 相手のキャラクターに値をセットする
        modelsB.position.set(data.x, 0, data.z);
        modelsB.rotation.y = data.y;
        walkB.paused = data.w;
        walkB.play();
      });
    });
    socket.on("disconnect", () => {
      console.log("接続が切れました");
    });
    socket.on("connect", () => {
      console.log("接続されました");
    });
    // models の位置情報をサーバーに送信
    socketRef.current = socket;
    return () => socket.disconnect();
  }, [modelsB]);

  // FromAPIと名付けて座標と回転、歩いているか否かの値をサーバーに送る
  const send = (props) => {
    socketRef.current.emit("FromAPI", {
      x: props.x,
      y: props.y,
      z: props.z,
      w: props.w,
    });
  };

  const walk = () => {
    // 自分のキャラクターとカメラの視点を同時に座標移動させて三人称視点にする
    TweenMax.set([modelsA.position, cameras.position], {
      z: `+= ${action.z}`,
      x: `+= ${action.x}`,
    });
    // Math.atan2で算出したradianに1.5を加算し前後左右にいい感じで向くようにする
    modelsA.rotation.y = Math.atan2(-action.z, action.x) + 1.5;
    // サーバーに自分のキャラクターの座標と回転、歩いているか否かの値をsend関数に渡す
    send({
      x: modelsA.position.x,
      y: modelsA.rotation.y,
      z: modelsA.position.z,
      w: walkA.paused,
    });
  };
  // TweenMax.to(何が, 何秒で, { z軸にdistance分移動 })
  const move = (props) => {
    walkA.paused = false; // キャラクターのポーズを解除
    walkA.play(); // // アニメーションである変数walkを再生
    setAction({ z: props.y, x: props.x }); // Position.jsから受け取った座標を変数actionにセット
    walk(); // walk関数を実行
    // 関数moveが実行されているときにdarumaがtrueなら初期座標に戻る
    if (stare) {
      TweenMax.set(modelsA.position, {
        x: 0,
        y: 0,
        z: 25,
      });
      TweenMax.set(cameras.position, {
        x: 0,
        y: 2,
        z: 32,
      });
      walkA.paused = true;
      send({
        x: modelsA.position.x,
        y: modelsA.rotation.y,
        z: modelsA.position.z,
        w: walkA.paused,
      });
    }
  };
  // Position.jsから画面から指を離すことで発火する
  const end = () => {
    // アニメーションをストップ
    walkA.paused = true;
    // ストップした時の自分のキャラクターの座標と回転、歩いているか否かの値をsend関数に渡す
    send({
      x: modelsA.position.x,
      y: modelsA.rotation.y,
      z: modelsA.position.z,
      w: walkA.paused,
    });
  };
  useEffect(() => {
    if (daruma) {
      if (modelsC !== null) {
        walkC.play();
        setTimeout(() => {
          setStare(true);
        }, 500);
      }
      setTimeout(() => {
        if (modelsC !== null) {
          setDaruma(false);
          setStare(false);
          walkC.stop();
        }
      }, 2500);
    }
  }, [daruma]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={async (gl) => {
            // 3D空間の準備
            const { drawingBufferWidth: width, drawingBufferHeight: height } =
              gl;
            const renderer = new Renderer({ gl }); // レンダラーの準備
            renderer.setSize(width, height); // 3D空間の幅と高さ
            renderer.setClearColor("white"); // 3D空間の配色
            const scene = new Scene(); // これが3D空間
            scene.add(new GridHelper(100, 100)); //グリッドを表示
            // GLTFをロードする
            const loader = new GLTFLoader();
            // 自分のキャラクターを設置
            const assetA = Asset.fromModule(require("./assets/testA.glb"));
            await assetA.downloadAsync();
            let mixerA;
            let clockA = new Clock();
            loader.load(
              assetA.uri || "",
              (gltf) => {
                const modelA = gltf.scene;
                modelA.position.set(0, 0, 25); // 配置される座標 (x,y,z)
                modelA.rotation.y = Math.PI;
                const animations = gltf.animations;
                //Animation Mixerインスタンスを生成
                mixerA = new AnimationMixer(modelA);
                // 設定した一つ目のアニメーションを設定
                let animation = animations[0];
                // アニメーションを変数walkにセット
                setWalkA(mixerA.clipAction(animation));
                // test.glbを3D空間に追加
                scene.add(modelA);
                setModelsA(modelA);
              },
              (xhr) => {
                console.log("ロード中");
              },
              (error) => {
                console.error("読み込めませんでした");
              }
            );
            // 相手のキャラクターを設置
            let mixerB;
            let clockB = new Clock();
            const assetB = Asset.fromModule(require("./assets/testB.glb"));
            await assetB.downloadAsync();
            loader.load(
              assetB.uri || "",
              (gltf) => {
                const modelB = gltf.scene;
                modelB.position.set(0, 0, 25); // 配置される座標 (x,y,z)
                modelB.rotation.y = Math.PI;
                const animations = gltf.animations;
                //Animation Mixerインスタンスを生成
                mixerB = new AnimationMixer(modelB);
                // 設定した一つ目のアニメーションを設定
                let animation = animations[0];
                // アニメーションを変数walkにセット
                setWalkB(mixerB.clipAction(animation));
                // test.glbを3D空間に追加;
                scene.add(modelB);
                setModelsB(modelB);
              },
              (xhr) => {
                console.log("ロード中");
              },
              (error) => {
                console.error("読み込めませんでした");
              }
            );
            // 敵のキャラクターを設置
            let mixerC;
            let clockC = new Clock();
            const assetC = Asset.fromModule(require("./assets/testC.glb"));
            await assetC.downloadAsync();
            loader.load(
              assetC.uri || "",
              (gltf) => {
                const modelC = gltf.scene;
                modelC.position.set(0, 0, -40); // 配置される座標 (x,y,z)
                modelC.rotation.y = Math.PI - 0.7;
                const animations = gltf.animations;
                //Animation Mixerインスタンスを生成
                mixerC = new AnimationMixer(modelC);
                // 設定した一つ目のアニメーションを設定
                let animation = animations[0];
                // アニメーションを変数walkにセット
                setWalkC(mixerC.clipAction(animation));
                // test.glbを3D空間に追加;
                scene.add(modelC);
                setModelsC(modelC);
              },
              (xhr) => {
                console.log("ロード中");
              },
              (error) => {
                console.error("読み込めませんでした");
              }
            );
            // 3D空間の光！
            const pointLight = new PointLight(0xffffff, 2, 1000, 1); //一点からあらゆる方向への光源(色, 光の強さ, 距離, 光の減衰率)
            pointLight.position.set(0, 200, 200); //配置される座標 (x,y,z)
            scene.add(pointLight); //3D空間に追加
            // カメラが映し出す設定(視野角, アスペクト比, near, far)
            const camera = new PerspectiveCamera(45, width / height, 1, 1000);
            setCameras(camera);
            // カメラの初期座標
            let cameraInitialPositionX = 0;
            let cameraInitialPositionY = 2;
            let cameraInitialPositionZ = 32;
            // カメラの座標
            camera.position.set(
              cameraInitialPositionX,
              cameraInitialPositionY,
              cameraInitialPositionZ
            );

            const render = () => {
              requestAnimationFrame(render); // アニメーション　moveUd関数、moveLr関数でカメラ座標が移動
              renderer.render(scene, camera); // レンダリング
              //Animation Mixerを自分と相手ともに実行
              if (mixerA) {
                mixerA.update(clockA.getDelta());
              }
              if (mixerB) {
                mixerB.update(clockB.getDelta());
              }
              if (mixerC) {
                mixerC.update(clockC.getDelta());
              }
              gl.endFrameEXP(); // 現在のフレームを表示する準備ができていることをコンテキストに通知するpresent (Expo公式)
            };
            render();
          }}
        />
      </View>
      <View style={{ alignSelf: "center" }}>
        <Positon
          // Position.jsからonMoveを受け取ってmove関数を実行
          onMove={(data) => {
            move({
              x: (data.x - 60) / 1000,
              y: (data.y - 60) / 1000,
            });
          }}
          // Position.jsからonEndを受け取ってend関数を実行
          onEnd={end}
        />
      </View>
    </>
  );
}
