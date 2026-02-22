import { Link } from 'expo-router'
import { Text, View } from 'react-native'

export default function Index() {
  return (
    <View>
      <Text style={{ color: 'red' }}>Index 2</Text>
      <Link href="/signup"><Text>Login</Text></Link>
    </View>
  )
}