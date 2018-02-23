import React from 'react';
import {
  AppRegistry,
  Pano,
  View,
  AmbientLight,
  Scene,
  Model,
  VrHeadModel,
  Animated
} from 'react-vr';

import io from 'socket.io-client';


export default class VR extends React.Component {
  constructor(props) {
    super(props);

    this.sTransleteY = 1;
    this.mScale = 0.028;
    this.mTranslateScale = 1 / this.mScale;
    this.mRotateFix = 190;
    this.interval = 500;

    this.state = {
      currentUser: {
        id: '',
        scene: 'default',
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
      },
      users: [],
      yRotation: new Animated.Value(0)
    };

    //this.socket = io('http://localhost:3000');
    this.socket = io('https://vr-room.herokuapp.com');
  }


   componentWillMount() {
    this.socket.on('user connected', (data) => {
      if (this.state.currentUser.id) {
        this.setState({
          users: data.users
        });
      } else {
        this.setState({ ...this.state, ...data});
      }
    });

    this.socket.on('user disconnected', (users) => {
      this.setState({...this.state, users: users});
    });
  }


  componentDidMount() {
    // VrHeadModel rotation listener
    this.intervalId = setInterval(() => {
      let rotation = [0, 0, 0];
      if (this.state.currentUser.id) rotation = VrHeadModel.rotation();

      let currentUserNew = {...this.state.currentUser};
      currentUserNew.rotate = [...rotation];

      let usersNew = [...this.state.users];

      for (let i = 0; i < usersNew.length; i++) {
        if (usersNew[i].id === currentUserNew.id) {
          usersNew[i].rotate = [...rotation];
          break;
        }
      }

      this.setState({
        ...this.state,
        currentUser: currentUserNew,
        users: usersNew
      }, () => {
        let data = {id: this.state.currentUser.id, rotate: rotation};
        this.socket.emit('user rotated', data);
      });
    }, this.interval);

    this.socket.on('user rotated callback', (users) => {
      this.setState({
        ...this.state,
        users: users
      });
    });
  }

  componentWillUpdate(nextProps, nextState) {
    // Animated.timing(nextState.yRotation, {
    //   duration: this.interval,
    //   toValue: nextState.users[0].rotate[1] + this.mRotateFix,
    // }).start();
  }


  componentWillUnmount() {
    clearInterval(this.intervalId);
  }


  render() {
    let scene = this.state.currentUser.scene;
    let translate = this.state.currentUser.translate;

    let sceneStyle = {
      transform: [
        {translate: [translate[0], this.sTransleteY, translate[2]]}
      ]
    };

    return (
      <View>
        <Scene style={sceneStyle}/>

        <AmbientLight intensity={1}
          style={{color: '#fff'}}
        />

        {scene === 'default' ? (
          <Pano source={{uri: '/static_assets/scenes/battleship_bay.png'}}/>
        ) : (
          <Pano source={{uri: '/static_assets/scenes/chess-world.jpg'}}/>
        )}

        {this.state.users.map(user => {
          let mTranslate = [
            user.translate[0] * this.mTranslateScale,
            user.translate[1] * this.mTranslateScale,
            user.translate[2] * this.mTranslateScale
          ];
          let mRotateY = user.rotate[1] + this.mRotateFix;
          return (
            <Model
              key={user.id}
              source={{
                obj: '/static_assets/models/sonic/sonic-the-hedgehog.obj',
                mtl: '/static_assets/models/sonic/sonic-the-hedgehog.mtl'
              }}
              style={{
                transform: [
                  {scale: this.mScale},
                  {translate: [mTranslate[0], mTranslate[1], mTranslate[2]]},
                  {rotateY: mRotateY},
                ]
              }}
              lit
              wireframe={false}
            />
          );
        })}
      </View>
    );
  }
};

AppRegistry.registerComponent('VR', () => VR);