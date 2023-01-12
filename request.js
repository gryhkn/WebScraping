import axios from "axios";

const data = {
  url: "https://www.doctoralia.es/estefania-maria-damaso-hernandez/psicologo/las-palmas-de-gran-canaria",
  from_date: "2022-08-01",
};
const config = {
  headers: {
    Authorization: "my-secret-token",
  },
};

axios
  .post("http://localhost:3000", data, config)
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.log(error);
  });
