import React, { FormEvent, ChangeEvent } from "react";

const TestComponent = () => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" onChange={handleChange} />
    </form>
  );
};

export default TestComponent;